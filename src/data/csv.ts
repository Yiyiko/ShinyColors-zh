import Papa from 'papaparse';
import {
  createUniqueStoryIdGenerator,
  decodeCsvNewlines,
  encodeCsvNewlines,
  isZeroPlaceholderId,
  normalizeLookupText,
  normalizeStoryPath,
  stripBom,
  trimSpaces,
} from '../core/normalize';

export interface StoryCsvRow {
  id: string;
  name: string;
  text: string;
  trans: string;
}

export interface ParsedStoryCsv {
  infoPath: string | null;
  translator: string;
  isAI: boolean;
  /** Map from disambiguated 13-digit line ID -> translated text */
  byId: Map<string, string>;
  /** Map from normalized original text (and `${text}#${occ}` for duplicates) -> translated text */
  byText: Map<string, string>;
  /** Map from normalized select option text -> translated option text */
  bySelect: Map<string, string>;
  /** Raw parsed dialogue/select rows */
  rowCount: number;
}

export interface StoryExportEntry {
  id?: string | number;
  speaker?: string;
  text?: string;
  select?: string;
}

export function parseStoryCsv(csvText: string): ParsedStoryCsv {
  const clean = stripBom(csvText);
  const parsed = Papa.parse<Record<string, string>>(clean, {
    header: true,
    skipEmptyLines: true,
  });

  const byId = new Map<string, string>();
  const byText = new Map<string, string>();
  const bySelect = new Map<string, string>();
  const textCounts = new Map<string, number>();
  const nextId = createUniqueStoryIdGenerator();

  let infoPath: string | null = null;
  let translator = '';
  let rowCount = 0;

  for (const row of parsed.data) {
    const rawId = trimSpaces(row.id);
    const rawName = trimSpaces(row.name);
    const rawText = row.text ?? '';
    const rawTrans = row.trans ?? '';

    if (rawId === 'info') {
      if (rawName) infoPath = normalizeStoryPath(rawName);
      continue;
    }
    if (rawId === '译者' || rawId === 'translator') {
      if (rawName) translator = rawName;
      continue;
    }

    const normText = normalizeLookupText(decodeCsvNewlines(rawText, false));
    const trans = decodeCsvNewlines(rawTrans, true);

    if (rawId === 'select') {
      rowCount += 1;
      if (normText && trans) {
        bySelect.set(normText, trans);
      }
      continue;
    }

    if (!normText && !rawId) continue;
    rowCount += 1;
    if (!trans) continue;

    if (!isZeroPlaceholderId(rawId)) {
      const uniqueId = nextId(rawId);
      byId.set(uniqueId, trans);
    }

    if (normText) {
      const occ = textCounts.get(normText) ?? 0;
      textCounts.set(normText, occ + 1);
      if (occ === 0) {
        byText.set(normText, trans);
      }
      byText.set(`${normText}#${occ}`, trans);
    }
  }

  const isAI = /^AI(?:\(|$|\s)/i.test(translator);

  return {
    infoPath,
    translator,
    isAI,
    byId,
    byText,
    bySelect,
    rowCount,
  };
}

export function exportStoryToCsv(
  entries: readonly StoryExportEntry[],
  infoPath: string,
  translator = '',
): string {
  const rows: StoryCsvRow[] = [];

  for (const item of entries) {
    const text = trimSpaces(encodeCsvNewlines(item.text));
    if (text) {
      rows.push({
        id: item.id !== undefined && item.id !== null && String(item.id).trim() !== ''
          ? String(item.id).trim()
          : '0000000000000',
        name: trimSpaces(item.speaker),
        text,
        trans: '',
      });
    } else if (item.select) {
      const select = trimSpaces(encodeCsvNewlines(item.select));
      if (select) {
        rows.push({
          id: 'select',
          name: '',
          text: select,
          trans: '',
        });
      }
    }
  }

  rows.push({ id: 'info', name: normalizeStoryPath(infoPath), text: '', trans: '' });
  rows.push({ id: '译者', name: translator, text: '', trans: '' });

  return Papa.unparse(rows, {
    columns: ['id', 'name', 'text', 'trans'],
    newline: '\n',
  }) + '\n';
}

export function parseKeyValueCsv(
  csvText: string,
  keyField = 'text',
  valueField = 'trans',
  options: { decodeNewlines?: boolean } = {},
): Map<string, string> {
  const clean = stripBom(csvText);
  const decode = options.decodeNewlines ?? true;
  const parsed = Papa.parse<Record<string, string>>(clean, {
    header: true,
    skipEmptyLines: true,
  });

  const map = new Map<string, string>();
  for (const row of parsed.data) {
    const rawKey = row[keyField];
    const rawVal = row[valueField];
    if (!rawKey || !rawVal) continue;
    const key = decode ? normalizeLookupText(decodeCsvNewlines(rawKey, false)) : trimSpaces(rawKey);
    const val = decode ? decodeCsvNewlines(rawVal, true) : trimSpaces(rawVal);
    if (key && val) {
      map.set(key, val);
    }
  }
  return map;
}
