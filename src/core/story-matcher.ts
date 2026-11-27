import type { ParsedStoryCsv } from '../data/csv';
import { createUniqueStoryIdGenerator, normalizeLookupText, trimSpaces } from './normalize';

export interface StoryItem {
  id?: string | number;
  speaker?: string;
  text?: string;
  select?: string;
  [key: string]: unknown;
}

export interface StoryMatchStats {
  totalLines: number;
  matchedLines: number;
  matchedById: number;
  matchedByText: number;
  matchedByComm: number;
  matchedSelects: number;
  totalSelects: number;
  matchedSpeakers: number;
  coveragePct: number;
}

export interface StoryMatchOptions {
  story?: ParsedStoryCsv | null;
  commMap?: ReadonlyMap<string, string> | null;
  nameMap?: ReadonlyMap<string, string> | null;
  /** Optional prefix marker (e.g. `\u200c`) to prevent PIXI static text hook from re-translating story lines */
  tagMarker?: string;
}

function translateSingleSpeakerToken(
  token: string,
  nameMap: ReadonlyMap<string, string>,
): string {
  const trimmed = trimSpaces(token);
  if (!trimmed) return token;
  if (nameMap.has(trimmed)) return nameMap.get(trimmed)!;

  const numMatch = trimmed.match(/^(.*?)([0-9０-９])$/);
  if (numMatch) {
    const [, base, suffix] = numMatch;
    if (nameMap.has(base)) {
      return nameMap.get(base)! + suffix;
    }
  }
  return token;
}

export function translateSpeaker(
  speaker: string | null | undefined,
  nameMap?: ReadonlyMap<string, string> | null,
): string {
  if (!speaker || !nameMap || nameMap.size === 0) return speaker ?? '';
  const trimmed = trimSpaces(speaker);
  if (!trimmed) return speaker;
  if (nameMap.has(trimmed)) return nameMap.get(trimmed)!;

  let current = trimmed;
  for (const sep of ['＆', '&']) {
    if (current.includes(sep)) {
      current = current
        .split(sep)
        .map((part) => translateSingleSpeakerToken(part, nameMap))
        .join(sep);
    }
  }

  if (current === trimmed) {
    current = translateSingleSpeakerToken(trimmed, nameMap);
  }
  return current;
}

export function applyStoryTranslation(
  items: StoryItem[],
  options: StoryMatchOptions,
): StoryMatchStats {
  const { story, commMap, nameMap, tagMarker = '' } = options;
  const nextId = createUniqueStoryIdGenerator();
  const textCounts = new Map<string, number>();

  const stats: StoryMatchStats = {
    totalLines: 0,
    matchedLines: 0,
    matchedById: 0,
    matchedByText: 0,
    matchedByComm: 0,
    matchedSelects: 0,
    totalSelects: 0,
    matchedSpeakers: 0,
    coveragePct: 0,
  };

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;

    if (typeof item.text === 'string' && item.text.trim()) {
      stats.totalLines += 1;
      const uid = nextId(item.id !== undefined ? String(item.id) : undefined);
      const norm = normalizeLookupText(item.text);
      const occ = textCounts.get(norm) ?? 0;
      textCounts.set(norm, occ + 1);

      let translated: string | undefined;
      if (story && uid && story.byId.has(uid)) {
        translated = story.byId.get(uid);
        stats.matchedById += 1;
      } else if (story && story.byText.has(`${norm}#${occ}`)) {
        translated = story.byText.get(`${norm}#${occ}`);
        stats.matchedByText += 1;
      } else if (story && story.byText.has(norm)) {
        translated = story.byText.get(norm);
        stats.matchedByText += 1;
      } else if (commMap && commMap.has(norm)) {
        translated = commMap.get(norm);
        stats.matchedByComm += 1;
      }

      if (translated) {
        item.text = tagMarker ? `${tagMarker}${translated}` : translated;
        stats.matchedLines += 1;
      }
    }

    if (typeof item.select === 'string' && item.select.trim()) {
      stats.totalSelects += 1;
      const normSel = normalizeLookupText(item.select);
      const transSel =
        story?.bySelect.get(normSel) ?? commMap?.get(normSel);
      if (transSel) {
        item.select = transSel;
        stats.matchedSelects += 1;
      }
    }

    if (typeof item.speaker === 'string' && item.speaker.trim() && nameMap) {
      const nextSpeaker = translateSpeaker(item.speaker, nameMap);
      if (nextSpeaker !== item.speaker) {
        item.speaker = nextSpeaker;
        stats.matchedSpeakers += 1;
      }
    }
  }

  const totalTrackable = stats.totalLines + stats.totalSelects;
  const totalMatched = stats.matchedLines + stats.matchedSelects;
  stats.coveragePct =
    totalTrackable > 0 ? Math.round((totalMatched / totalTrackable) * 1000) / 10 : 100;

  return stats;
}
