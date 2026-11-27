import Papa from 'papaparse';
import { normalizeStoryPath, stripBom, trimSpaces } from '../core/normalize';
import { compileTemplateCsv, TemplateTextMatcher } from '../core/template-matcher';
import { type DataCache, IndexedDbCache } from './cache-idb';
import { parseKeyValueCsv, parseStoryCsv, type ParsedStoryCsv } from './csv';
import {
  loadCachedTextFile,
  loadManifest,
  type LoadedManifest,
  type ManifestData,
  type StoryIndexTuple,
} from './manifest';
import { buildSourceList, type TextFetcher } from './sources';

export const CUSTOM_SOURCE_STORAGE_KEY = 'sczh:customSource';

export interface ImageRule {
  url: string;
  version: string;
}

export interface DataRepositoryOptions {
  cache?: DataCache;
  customSource?: string | null;
  fetcher?: TextFetcher;
  timeoutMs?: number;
}

export function readCustomSource(): string | null {
  try {
    return localStorage.getItem(CUSTOM_SOURCE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeCustomSource(url: string | null): void {
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem(CUSTOM_SOURCE_STORAGE_KEY);
    } else {
      localStorage.setItem(CUSTOM_SOURCE_STORAGE_KEY, url.trim());
    }
  } catch {
    // Ignore storage errors
  }
}

export class DataRepository {
  readonly cache: DataCache;
  private readonly sources: string[];
  private readonly fetcher?: TextFetcher;
  private readonly timeoutMs: number;

  private manifestPromise: Promise<LoadedManifest> | null = null;
  private activeSource: string | null = null;
  private storyIndexPromise: Promise<Map<string, { hash: string; isAI: boolean }>> | null = null;
  private pictureMapPromise: Promise<Map<string, string>> | null = null;
  private imageMapPromise: Promise<Map<string, ImageRule>> | null = null;
  private kvPromises = new Map<string, Promise<Map<string, string>>>();
  private templatePromises = new Map<string, Promise<TemplateTextMatcher>>();
  private storyPromises = new Map<string, Promise<ParsedStoryCsv | null>>();

  constructor(options: DataRepositoryOptions = {}) {
    this.cache = options.cache ?? new IndexedDbCache();
    this.sources = buildSourceList(options.customSource ?? readCustomSource());
    this.fetcher = options.fetcher;
    this.timeoutMs = options.timeoutMs ?? 8000;
  }

  getSources(): readonly string[] {
    return this.sources;
  }

  getActiveBaseUrl(): string {
    return this.activeSource ?? this.sources[0];
  }

  async getManifest(): Promise<LoadedManifest> {
    if (!this.manifestPromise) {
      this.manifestPromise = loadManifest({
        cache: this.cache,
        sources: this.sources,
        fetcher: this.fetcher,
        timeoutMs: this.timeoutMs,
      }).then((loaded) => {
        if (!loaded.fromCache && /^https?:\/\//i.test(loaded.source)) {
          this.activeSource = loaded.source;
        }
        return loaded;
      });
    }
    return this.manifestPromise;
  }

  async loadTextByManifest(relPath: string): Promise<string | null> {
    const { manifest } = await this.getManifest();
    const hash = manifest.files[relPath];
    if (!hash) return null;
    const res = await loadCachedTextFile(relPath, hash, {
      cache: this.cache,
      sources: this.getOrderedSources(),
      fetcher: this.fetcher,
      timeoutMs: this.timeoutMs,
    });
    return res.text;
  }

  private getOrderedSources(): readonly string[] {
    if (!this.activeSource) return this.sources;
    return [this.activeSource, ...this.sources.filter((s) => s !== this.activeSource)];
  }

  async getStoryIndex(): Promise<Map<string, { hash: string; isAI: boolean }>> {
    if (!this.storyIndexPromise) {
      this.storyIndexPromise = (async () => {
        const text = await this.loadTextByManifest('story-index.json');
        const map = new Map<string, { hash: string; isAI: boolean }>();
        if (!text) return map;
        const list = JSON.parse(text) as StoryIndexTuple[];
        for (const item of list) {
          if (item[0] && item[1]) {
            map.set(normalizeStoryPath(item[0]), {
              hash: item[1],
              isAI: Boolean(item[2]),
            });
          }
        }
        return map;
      })();
    }
    return this.storyIndexPromise;
  }

  async getStory(logicalPath: string): Promise<ParsedStoryCsv | null> {
    const norm = normalizeStoryPath(logicalPath);
    if (!this.storyPromises.has(norm)) {
      this.storyPromises.set(
        norm,
        (async () => {
          const index = await this.getStoryIndex();
          const entry = index.get(norm);
          if (!entry) return null;
          const relPath = `data/story/${entry.hash}.csv`;
          const res = await loadCachedTextFile(relPath, entry.hash, {
            cache: this.cache,
            sources: this.getOrderedSources(),
            fetcher: this.fetcher,
            timeoutMs: this.timeoutMs,
          });
          const parsed = parseStoryCsv(res.text);
          if (entry.isAI && !parsed.isAI) {
            parsed.isAI = true;
          }
          return parsed;
        })().catch(() => null),
      );
    }
    return this.storyPromises.get(norm)!;
  }

  async getKeyValueMap(
    relPath: string,
    keyField = 'text',
    valueField = 'trans',
  ): Promise<Map<string, string>> {
    const cacheKey = `${relPath}|${keyField}|${valueField}`;
    if (!this.kvPromises.has(cacheKey)) {
      this.kvPromises.set(
        cacheKey,
        (async () => {
          const text = await this.loadTextByManifest(relPath);
          if (!text) return new Map<string, string>();
          return parseKeyValueCsv(text, keyField, valueField);
        })().catch(() => new Map<string, string>()),
      );
    }
    return this.kvPromises.get(cacheKey)!;
  }

  getPhraseMap(): Promise<Map<string, string>> {
    return this.getKeyValueMap('data/phrase.csv', 'id', 'trans');
  }

  getCommonTextMap(): Promise<Map<string, string>> {
    return this.getKeyValueMap('data/common.csv', 'text', 'trans');
  }

  getTypeTextMap(): Promise<Map<string, string>> {
    return this.getKeyValueMap('data/type-text.csv', 'text', 'trans');
  }

  getCommStoryMap(): Promise<Map<string, string>> {
    return this.getKeyValueMap('data/comm-story.csv', 'text', 'trans');
  }

  getNameMap(): Promise<Map<string, string>> {
    return this.getKeyValueMap('data/name.csv', 'name', 'trans');
  }

  getIdolNameMap(): Promise<Map<string, string>> {
    return this.getKeyValueMap('data/etc/idol-name.csv', 'name', 'trans');
  }

  async getTemplateMatcher(relPath: string): Promise<TemplateTextMatcher> {
    if (!this.templatePromises.has(relPath)) {
      this.templatePromises.set(
        relPath,
        (async () => {
          const [csv, idolNameMap] = await Promise.all([
            this.loadTextByManifest(relPath),
            this.getIdolNameMap(),
          ]);
          if (!csv) {
            return new TemplateTextMatcher({ textMap: new Map(), wordMaps: [], expMap: new Map() });
          }
          return new TemplateTextMatcher(compileTemplateCsv(csv, { nameMap: idolNameMap }));
        })().catch(
          () => new TemplateTextMatcher({ textMap: new Map(), wordMaps: [], expMap: new Map() }),
        ),
      );
    }
    return this.templatePromises.get(relPath)!;
  }

  async getImageMap(): Promise<Map<string, ImageRule>> {
    if (!this.imageMapPromise) {
      this.imageMapPromise = (async () => {
        const text = await this.loadTextByManifest('data/etc/image.csv');
        const map = new Map<string, ImageRule>();
        if (!text) return map;
        const parsed = Papa.parse<Record<string, string>>(stripBom(text), {
          header: true,
          skipEmptyLines: true,
        });
        for (const row of parsed.data) {
          const name = trimSpaces(row.name);
          const url = trimSpaces(row.url);
          const version = trimSpaces(row.version) || '1';
          if (name && url) {
            map.set(name, { url, version });
          }
        }
        return map;
      })().catch(() => new Map<string, ImageRule>());
    }
    return this.imageMapPromise;
  }

  async getPictureMap(): Promise<Map<string, string>> {
    if (!this.pictureMapPromise) {
      this.pictureMapPromise = (async () => {
        const text = await this.loadTextByManifest('picture.json');
        const map = new Map<string, string>();
        if (!text) return map;
        const list = JSON.parse(text) as Array<[string, string]>;
        for (const [key, hash] of list) {
          if (key && hash) map.set(key, hash);
        }
        return map;
      })().catch(() => new Map<string, string>());
    }
    return this.pictureMapPromise;
  }

  buildAssetUrl(relPath: string, manifest: ManifestData): string | null {
    const hash = manifest.files[relPath];
    if (!hash) return null;
    const base = this.getActiveBaseUrl().replace(/\/+$/, '');
    const cleanRel = relPath.replace(/^\/+/, '');
    return `${base}/${cleanRel}?v=${encodeURIComponent(hash)}`;
  }

  async clearCache(): Promise<void> {
    await this.cache.clear();
    this.manifestPromise = null;
    this.storyIndexPromise = null;
    this.pictureMapPromise = null;
    this.imageMapPromise = null;
    this.kvPromises.clear();
    this.templatePromises.clear();
    this.storyPromises.clear();
  }
}
