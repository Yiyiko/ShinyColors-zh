import Papa from 'papaparse';
import { encodeCsvNewlines, normalizeStoryPath } from '../core/normalize';
import type { StoryItem } from '../core/story-matcher';
import { exportStoryToCsv, parseStoryCsv, type ParsedStoryCsv } from '../data/csv';

const PREVIEW_STORAGE_KEY = 'sczh:preview-csv';

export interface CapturedStorySnapshot {
  path: string;
  items: StoryItem[];
  capturedAt: string;
}

export class StoryEditorStore {
  private lastStory: CapturedStorySnapshot | null = null;
  private untranslated = new Map<string, StoryItem[]>();
  private untranslatedVoices = new Set<string>();
  private previewMap = new Map<string, ParsedStoryCsv>();
  private loadedPreview = false;

  recordUntranslatedVoice(text: string): void {
    const clean = text.trim();
    if (!clean || this.untranslatedVoices.size >= 500) return;
    this.untranslatedVoices.add(clean);
  }

  getUntranslatedVoiceCount(): number {
    return this.untranslatedVoices.size;
  }

  exportUntranslatedVoicesCsv(): string | null {
    if (this.untranslatedVoices.size === 0) return null;
    const rows = Array.from(this.untranslatedVoices).map((t) => ({
      text: encodeCsvNewlines(t),
      trans: '',
    }));
    return Papa.unparse(rows, { columns: ['text', 'trans'], newline: '\n' }) + '\n';
  }

  recordLoadedStory(logicalPath: string, rawItems: readonly StoryItem[], hasTranslation: boolean): void {
    const norm = normalizeStoryPath(logicalPath);
    const cloned = rawItems.map((item) => ({ ...item }));
    this.lastStory = {
      path: norm,
      items: cloned,
      capturedAt: new Date().toISOString(),
    };
    if (!hasTranslation) {
      this.untranslated.set(norm, cloned);
    }
  }

  getLastStory(): CapturedStorySnapshot | null {
    return this.lastStory;
  }

  getUntranslatedPaths(): string[] {
    return Array.from(this.untranslated.keys());
  }

  exportLastStoryCsv(translator = ''): { filename: string; content: string } | null {
    if (!this.lastStory) return null;
    const filename = `${this.lastStory.path.replace(/\.json$/i, '').replace(/\//g, '_')}.csv`;
    const content = exportStoryToCsv(this.lastStory.items, this.lastStory.path, translator);
    return { filename, content };
  }

  exportUntranslatedBundle(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [storyPath, items] of this.untranslated) {
      out[storyPath] = exportStoryToCsv(items, storyPath, '');
    }
    return out;
  }

  setPreviewCsv(csvText: string): ParsedStoryCsv | null {
    const parsed = parseStoryCsv(csvText);
    if (!parsed.infoPath) return null;
    this.ensurePreviewLoaded();
    this.previewMap.set(parsed.infoPath, parsed);
    this.persistPreview(parsed.infoPath, csvText);
    return parsed;
  }

  getPreview(logicalPath: string): ParsedStoryCsv | null {
    this.ensurePreviewLoaded();
    return this.previewMap.get(normalizeStoryPath(logicalPath)) ?? null;
  }

  clearPreviews(): void {
    this.previewMap.clear();
    try {
      sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
    } catch {
      // Ignore storage restriction
    }
  }

  private ensurePreviewLoaded(): void {
    if (this.loadedPreview) return;
    this.loadedPreview = true;
    try {
      const raw = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw) as Record<string, string>;
      for (const [k, csv] of Object.entries(obj)) {
        this.previewMap.set(normalizeStoryPath(k), parseStoryCsv(csv));
      }
    } catch {
      // Ignore malformed session preview
    }
  }

  private persistPreview(infoPath: string, csvText: string): void {
    try {
      const raw = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
      const obj: Record<string, string> = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      obj[infoPath] = csvText;
      sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // Ignore quota errors
    }
  }
}

export function triggerTextDownload(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  (document.body ?? document.documentElement).appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
