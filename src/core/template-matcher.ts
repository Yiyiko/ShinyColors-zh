import Papa from 'papaparse';
import { decodeCsvNewlines, normalizeLookupText, stripBom, trimSpaces } from './normalize';

const NUM_RE = '([+-＋－]?[0-9０-９]{1,10}\\.?[0-9０-９]{0,4}[万億]?)';
const PERCENT_RE = '([+-＋－]?[0-9０-９]{1,10}\\.?[0-9０-９]{0,4}?[%％])';
const UNKNOWN_RE = '([\\s\\S]*)';
const SEP_RE = '[\\s\\S]?';

function escapeRegexChars(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeTemplateLiteral(str: string): string {
  return str.replace(/\./g, '\\.').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

function restoreSpace(str: string): string {
  return str.replace(/\u200b/g, ' ');
}

export interface CompiledTemplateDict {
  textMap: Map<string, string>;
  wordMaps: ReadonlyMap<string, string>[];
  expMap: Map<RegExp, string>;
}

/**
 * Compiles community `text,trans,type` CSV tables (skill, mission, item, title, support-skill, etc.)
 * into exact-match + regex-template matchers compatible with ShinyGroup/SCTranslationData.
 */
export function compileTemplateCsv(
  csvText: string,
  extraWordMaps: { nameMap?: ReadonlyMap<string, string> } = {},
): CompiledTemplateDict {
  const clean = stripBom(csvText);
  const parsed = Papa.parse<Record<string, string>>(clean, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = parsed.data
    .filter((r) => Boolean(r?.text && r?.trans))
    .sort((a, b) => (b.text?.length ?? 0) - (a.text?.length ?? 0));

  const textMap = new Map<string, string>();
  const wordMap = new Map<string, string>();
  const reMap = new Map<string, string>();
  const typeBuckets = new Map<string, string[]>();

  const nameMap = extraWordMaps.nameMap ?? new Map<string, string>();
  if (nameMap.size > 0) {
    const sortedNames = Array.from(nameMap.keys())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .map(escapeRegexChars);
    typeBuckets.set('name', sortedNames);
  }

  for (const row of rows) {
    const text = normalizeLookupText(decodeCsvNewlines(row.text, false));
    const trans = restoreSpace(decodeCsvNewlines(row.trans, true));
    const rawType = row.type;
    const type = rawType === undefined ? undefined : trimSpaces(rawType);

    if (!text || !trans) continue;

    if (type === undefined || type === 'text') {
      if (!textMap.has(text)) textMap.set(text, trans);
    } else if (type === '' || type === 'exp') {
      const escaped = escapeTemplateLiteral(text);
      if (!reMap.has(escaped)) reMap.set(escaped, trans);
    } else {
      if (!typeBuckets.has(type)) typeBuckets.set(type, []);
      typeBuckets.get(type)!.push(escapeRegexChars(text));
      if (!wordMap.has(text)) wordMap.set(text, trans);
    }
  }

  const placeholderRules: Array<{ re: RegExp; exp: string }> = [];
  for (const [type, list] of typeBuckets) {
    if (list.length === 0) continue;
    placeholderRules.push({
      re: new RegExp(`\\$${escapeRegexChars(type)}`, 'g'),
      exp: `(${list.join('|')})`,
    });
  }

  const expMap = new Map<RegExp, string>();
  for (const [pattern, trans] of reMap) {
    let expr = pattern
      .replace(/\$num/g, NUM_RE)
      .replace(/\$percent/g, PERCENT_RE)
      .replace(/\$unknown/g, UNKNOWN_RE)
      .replace(/\$uk/g, UNKNOWN_RE)
      .replace(/\$sep/g, SEP_RE);

    for (const rule of placeholderRules) {
      expr = expr.replace(rule.re, rule.exp);
      rule.re.lastIndex = 0;
    }

    try {
      expMap.set(new RegExp(expr, 'gi'), trans);
    } catch {
      // Ignore malformed upstream regex row instead of crashing runtime
    }
  }

  const allTextMap = new Map<string, string>([...textMap, ...wordMap, ...nameMap]);
  const wordMaps: ReadonlyMap<string, string>[] = nameMap.size > 0 ? [wordMap, nameMap] : [wordMap];

  return {
    textMap: allTextMap,
    wordMaps,
    expMap,
  };
}

export class TemplateTextMatcher {
  private cache = new Map<string, string>();

  constructor(private readonly dict: CompiledTemplateDict) {}

  translate(input: string): string {
    if (typeof input !== 'string' || !input.trim()) return input;
    const norm = normalizeLookupText(input);
    if (!norm) return input;

    const exact = this.dict.textMap.get(norm);
    if (exact !== undefined) return exact;

    const cached = this.cache.get(norm);
    if (cached !== undefined) return cached;

    let result = norm;
    for (const [re, trans] of this.dict.expMap) {
      result = result.replace(re, (...args: unknown[]) => {
        let replacedText = trans;
        const captureCount = args.length - 2;
        for (let i = 1; i < captureCount; i++) {
          const cap = String(args[i] ?? '');
          let mapped: string | undefined;
          for (const wm of this.dict.wordMaps) {
            if (wm.has(cap)) {
              mapped = wm.get(cap);
              break;
            }
          }
          const finalCap = mapped ?? cap.replace(/億$/, '亿');
          replacedText = replacedText.replace(`$${i}`, finalCap);
        }
        return replacedText;
      });
      re.lastIndex = 0;
    }

    if (result !== norm) {
      if (this.cache.size > 4000) this.cache.clear();
      this.cache.set(norm, result);
      return result;
    }
    return input;
  }

  translateField(obj: Record<string, unknown> | null | undefined, key: string): boolean {
    if (!obj || typeof obj[key] !== 'string') return false;
    const before = obj[key] as string;
    const after = this.translate(before);
    if (after !== before) {
      obj[key] = after;
      return true;
    }
    return false;
  }

  translateLinesField(obj: Record<string, unknown> | null | undefined, key: string): boolean {
    if (!obj || typeof obj[key] !== 'string') return false;
    const before = obj[key] as string;
    const lines = before.split('\n').map((line) => this.translate(line));
    const after = lines.join('\n');
    if (after !== before) {
      obj[key] = after;
      return true;
    }
    return false;
  }
}
