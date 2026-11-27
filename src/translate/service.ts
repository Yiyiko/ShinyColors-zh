import { normalizeLookupText, normalizeStoryPath } from '../core/normalize';
import type { StoryItem } from '../core/story-matcher';
import { type DataCache, IndexedDbCache } from '../data/cache-idb';
import { getMtPreset, loadMtConfig, saveMtConfig, type MtConfig } from './config';
import { defaultMtHttpClient, type MtHttpClient } from './http';
import {
  dispatchProviderTranslate,
  translateWithFreeGoogle,
  type TranslateLineInput,
} from './providers';

export interface StoryMtResult {
  texts: Map<number, string>;
  selects: Map<number, string>;
  engineLabel: string;
  fromCache: boolean;
  usedFallback: boolean;
}

export interface CachedStoryMtPayload {
  texts: Array<[number, string]>;
  selects: Array<[number, string]>;
  engineLabel: string;
}

export interface TestConnectionResult {
  ok: boolean;
  engineLabel: string;
  sampleOutput?: string;
  elapsedMs: number;
  usedFallback?: boolean;
  error?: string;
}

function quickHash(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export class RuntimeTranslator {
  private readonly cache: DataCache;
  private readonly http: MtHttpClient;
  private config: MtConfig;
  private inflightStories = new Map<string, Promise<StoryMtResult | null>>();

  constructor(options: { cache?: DataCache; http?: MtHttpClient; config?: MtConfig } = {}) {
    this.cache = options.cache ?? new IndexedDbCache('sczh-mt-cache-v1');
    this.http = options.http ?? defaultMtHttpClient;
    this.config = options.config ?? loadMtConfig();
  }

  getConfig(): MtConfig {
    return { ...this.config };
  }

  updateConfig(next: MtConfig): void {
    this.config = { ...next };
    saveMtConfig(this.config);
  }

  isStoryTranslationEnabled(): boolean {
    return this.config.enabled && this.config.translateStories;
  }

  isVoiceTranslationEnabled(): boolean {
    return this.config.enabled && this.config.translateVoices;
  }

  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  private formatEngineLabel(cfg: MtConfig, fallbackUsed: boolean): string {
    if (fallbackUsed || cfg.provider === 'free-google') {
      return '免费保底(Google)';
    }
    const preset = getMtPreset(cfg.provider);
    const shortName = preset.id === 'openai-compat' ? '自定义AI' : preset.id.toUpperCase();
    return cfg.model ? `${shortName}/${cfg.model}` : shortName;
  }

  private async runWithFallback(
    lines: readonly TranslateLineInput[],
  ): Promise<{ outputs: string[]; engineLabel: string; usedFallback: boolean }> {
    const cfg = this.config;
    const preset = getMtPreset(cfg.provider);
    const canUsePrimary = cfg.provider === 'free-google' || !preset.requiresKey || Boolean(cfg.apiKey);

    if (canUsePrimary) {
      try {
        const outputs = await dispatchProviderTranslate({
          config: cfg,
          lines,
          http: this.http,
        });
        return {
          outputs,
          engineLabel: this.formatEngineLabel(cfg, false),
          usedFallback: false,
        };
      } catch (primaryErr) {
        if (!cfg.fallbackToFree || cfg.provider === 'free-google') {
          throw primaryErr;
        }
        const outputs = await translateWithFreeGoogle({
          config: cfg,
          lines,
          http: this.http,
        });
        return {
          outputs,
          engineLabel: this.formatEngineLabel(cfg, true),
          usedFallback: true,
        };
      }
    }

    if (cfg.fallbackToFree) {
      const outputs = await translateWithFreeGoogle({
        config: cfg,
        lines,
        http: this.http,
      });
      return {
        outputs,
        engineLabel: this.formatEngineLabel(cfg, true),
        usedFallback: true,
      };
    }

    throw new Error(`${preset.label} 尚未填写 API Key，且未开启免费保底`);
  }

  async translateStory(
    logicalPath: string,
    items: readonly StoryItem[],
  ): Promise<StoryMtResult | null> {
    if (!this.isStoryTranslationEnabled()) return null;

    const normPath = normalizeStoryPath(logicalPath);
    const lineSlots: Array<{ index: number; kind: 'text' | 'select'; input: TranslateLineInput }> = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item || typeof item !== 'object') continue;
      if (typeof item.text === 'string' && item.text.trim()) {
        lineSlots.push({
          index: i,
          kind: 'text',
          input: { text: normalizeLookupText(item.text), speaker: item.speaker },
        });
      } else if (typeof item.select === 'string' && item.select.trim()) {
        lineSlots.push({
          index: i,
          kind: 'select',
          input: { text: normalizeLookupText(item.select) },
        });
      }
    }
    if (lineSlots.length === 0) return null;

    const contentHash = quickHash(
      `${this.config.provider}:${this.config.model}:${lineSlots.map((s) => s.input.text).join('\u0001')}`,
    );
    const cacheKey = `mt:story:${normPath}`;

    const cached = await this.cache.get<CachedStoryMtPayload>(cacheKey);
    if (cached && cached.hash === contentHash && cached.value) {
      return {
        texts: new Map(cached.value.texts),
        selects: new Map(cached.value.selects),
        engineLabel: cached.value.engineLabel,
        fromCache: true,
        usedFallback: cached.value.engineLabel.includes('免费保底'),
      };
    }

    const existing = this.inflightStories.get(cacheKey);
    if (existing) return existing;

    const job = (async (): Promise<StoryMtResult | null> => {
      const { outputs, engineLabel, usedFallback } = await this.runWithFallback(
        lineSlots.map((s) => s.input),
      );

      const texts = new Map<number, string>();
      const selects = new Map<number, string>();
      for (let i = 0; i < lineSlots.length; i++) {
        const slot = lineSlots[i];
        const translated = outputs[i]?.trim();
        if (!translated) continue;
        if (slot.kind === 'text') texts.set(slot.index, translated);
        else selects.set(slot.index, translated);
      }

      await this.cache.set<CachedStoryMtPayload>(cacheKey, contentHash, {
        texts: Array.from(texts.entries()),
        selects: Array.from(selects.entries()),
        engineLabel,
      });

      return { texts, selects, engineLabel, fromCache: false, usedFallback };
    })().finally(() => {
      this.inflightStories.delete(cacheKey);
    });

    this.inflightStories.set(cacheKey, job);
    return job;
  }

  async translateVoices(rawTexts: readonly string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (!this.isVoiceTranslationEnabled() || rawTexts.length === 0) return result;

    const unique: string[] = [];
    const seen = new Set<string>();
    for (const t of rawTexts) {
      const norm = normalizeLookupText(t);
      if (norm && !seen.has(norm)) {
        seen.add(norm);
        unique.push(norm);
      }
    }

    const pending: string[] = [];
    for (const norm of unique) {
      const key = `mt:voice:${quickHash(norm)}`;
      const cached = await this.cache.get<string>(key);
      if (cached && cached.value) {
        result.set(norm, cached.value);
      } else {
        pending.push(norm);
      }
    }

    if (pending.length === 0) return result;

    // Limit single burst to 60 lines to keep API latency snappy
    const slice = pending.slice(0, 60);
    const { outputs } = await this.runWithFallback(slice.map((t) => ({ text: t })));
    for (let i = 0; i < slice.length; i++) {
      const norm = slice[i];
      const trans = outputs[i]?.trim();
      if (trans) {
        result.set(norm, trans);
        await this.cache.set<string>(`mt:voice:${quickHash(norm)}`, this.config.provider, trans);
      }
    }
    return result;
  }

  async testConnection(): Promise<TestConnectionResult> {
    const start = Date.now();
    try {
      const { outputs, engineLabel, usedFallback } = await this.runWithFallback([
        { text: 'プロデューサーさん、今日も一緒に頑張りましょうね！', speaker: '真乃' },
      ]);
      return {
        ok: true,
        engineLabel,
        sampleOutput: outputs[0],
        elapsedMs: Date.now() - start,
        usedFallback,
      };
    } catch (err) {
      return {
        ok: false,
        engineLabel: this.formatEngineLabel(this.config, false),
        elapsedMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
