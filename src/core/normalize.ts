export const STORY_PATH_PREFIXES = [
  'produce_events/',
  'produce_communications/',
  'produce_communications_promises/',
  'produce_communication_promise_results/',
  'game_event_communications/',
  'special_communications/',
  'character_special_communications/',
  'mypage_communications/',
  'produce_communication_cheers/',
  'produce_communication_auditions/',
  'produce_communication_televisions/',
  'business_unit_communication/',
  'poker_produce_events/',
] as const;

export function trimSpaces(str: string | null | undefined): string {
  if (!str) return '';
  return str.replace(/^[ ]+|[ ]+$/g, '');
}

/**
 * Decode literal `\n` / `\r\n` sequences stored in community CSV files into real newlines.
 */
export function decodeCsvNewlines(str: string | null | undefined, preserveDouble = false): string {
  const decoded = trimSpaces(str)
    .replace(/(\\r)?\\n/g, '\n')
    .replace(/\\r/g, '\n');
  return preserveDouble ? decoded : decoded.replace(/\n{2,}/g, '\n');
}

/**
 * Encode real newlines into literal `\n` for community CSV export.
 */
export function encodeCsvNewlines(str: string | null | undefined): string {
  if (!str) return '';
  return str.replace(/\r?\n/g, '\\n').replace(/\r/g, '\\n');
}

/**
 * Normalize runtime text newlines for dictionary lookup.
 */
export function normalizeLookupText(str: string | null | undefined): string {
  return trimSpaces(str).replace(/\r\n?/g, '\n').replace(/\n{2,}/g, '\n');
}

export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function normalizeStoryPath(rawPath: string): string {
  return rawPath
    .trim()
    .replace(/^\/+/, '')
    .replace(/^assets\/json\//, '');
}

export function isStoryPath(rawPath: string): boolean {
  const norm = normalizeStoryPath(rawPath);
  return STORY_PATH_PREFIXES.some((prefix) => norm.startsWith(prefix));
}

export function isZeroPlaceholderId(id: string | null | undefined): boolean {
  return !id || /^0+$/.test(id.trim());
}

/**
 * Generates deterministic disambiguated IDs for duplicate non-zero line IDs within a single story,
 * matching the legacy biuuu/ShinyColors `uniqueStoryId` convention:
 * 1st occurrence -> `id`, 2nd -> `${id}-0`, 3rd -> `${id}-1`, ...
 */
export function createUniqueStoryIdGenerator(): (id: string | null | undefined) => string {
  const counts = new Map<string, number>();
  return (rawId) => {
    const id = rawId ? String(rawId).trim() : '';
    if (id && !isZeroPlaceholderId(id) && id !== 'select') {
      if (counts.has(id)) {
        const count = counts.get(id)!;
        counts.set(id, count + 1);
        return `${id}-${count}`;
      }
      counts.set(id, 0);
    }
    return id;
  };
}
