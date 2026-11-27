import { normalizeLookupText } from './normalize';

export const STORY_TAG_MARKER = '\u200c';

export interface TextMatcherOptions {
  commonMap?: ReadonlyMap<string, string>;
  typeTextMap?: ReadonlyMap<string, string>;
  typingTtlMs?: number;
  now?: () => number;
}

/**
 * Matches PIXI static and typewriter texts while preventing partial typewriter frames
 * from being corrupted by static dictionary replacements.
 */
export class PixiTextMatcher {
  private commonMap: ReadonlyMap<string, string>;
  private typeTextMap: ReadonlyMap<string, string>;
  private readonly typingTtlMs: number;
  private readonly now: () => number;
  private activeTyping: Array<{ text: string; expiresAt: number }> = [];

  constructor(options: TextMatcherOptions = {}) {
    this.commonMap = options.commonMap ?? new Map();
    this.typeTextMap = options.typeTextMap ?? new Map();
    this.typingTtlMs = options.typingTtlMs ?? 10_000;
    this.now = options.now ?? (() => Date.now());
  }

  setDictionaries(
    commonMap: ReadonlyMap<string, string>,
    typeTextMap: ReadonlyMap<string, string>,
  ): void {
    this.commonMap = commonMap;
    this.typeTextMap = typeTextMap;
  }

  private pruneExpired(): void {
    const current = this.now();
    this.activeTyping = this.activeTyping.filter((item) => item.expiresAt > current);
  }

  private recordTyping(text: string): void {
    this.pruneExpired();
    this.activeTyping.push({ text, expiresAt: this.now() + this.typingTtlMs });
  }

  isTypingPrefix(text: string): boolean {
    this.pruneExpired();
    for (const item of this.activeTyping) {
      if (item.text.startsWith(text)) {
        return true;
      }
    }
    return false;
  }

  translateTypeText(text: string): string {
    if (typeof text !== 'string' || !text.trim()) return text;
    const key = normalizeLookupText(text);
    const hit = this.typeTextMap.get(key);
    const result = hit ?? text;
    this.recordTyping(result);
    return result;
  }

  translateStaticText(text: string): string {
    if (typeof text !== 'string' || !text.trim()) return text;
    if (text.startsWith(STORY_TAG_MARKER)) return text;
    if (this.isTypingPrefix(text)) return text;
    const key = normalizeLookupText(text);
    return this.commonMap.get(key) ?? text;
  }
}
