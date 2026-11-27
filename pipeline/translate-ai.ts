import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';
import {
  decodeCsvNewlines,
  encodeCsvNewlines,
  normalizeStoryPath,
  trimSpaces,
} from '../src/core/normalize';
import { lintStoryCsvContent, type LintIssue } from './lint';
import { readTextUtf8, walkFiles, writeTextUtf8 } from './utils';

export const COMMUNITY_STYLE_GUIDE = `
1. 标点符号规范：
   - 使用全角逗号（，），绝不使用半角逗号（,）或日文逗号（、）
   - 使用全角波浪号（～），绝不使用半角波浪号（~）
   - 使用标准中文省略号（……），绝不使用小数点（...）或单个省略号（…）
   - 使用标准破折号（——），绝不使用连字符（-）、单个破折号（—）或日文长音（ー）
   - 绝不使用日文引号（『』），改用中文双引号（“”）或书名号（《》）
2. 称谓规范：
   - ちゃん、さん 不可翻译为“某某酱”“某某桑”
3. 断行与字数规范：
   - 保持适当换行（用字面量 \\n 表示换行）
   - 选项框（id 为 select）单行不超过 11 个字
   - 普通小框台词单行尽量不超过 17 个字，按语气自然断行
4. 角色与组合固定译名（必须严格一致）：
   櫻木真乃→樱木真乃，風野灯織→风野灯织，八宮めぐる→八宫巡，月岡恋鐘→月冈恋钟，
   田中摩美々→田中摩美美，白瀬咲耶→白濑咲耶，三峰結華→三峰结华，幽谷霧子→幽谷雾子，
   小宮果穂→小宫果穗，園田智代子→园田智代子，西城樹里→西城树里，杜野凛世→杜野凛世，
   有栖川夏葉→有栖川夏叶，大崎甘奈→大崎甘奈，大崎甜花→大崎甜花，桑山千雪→桑山千雪，
   芹沢あさひ→芹泽朝日，黛冬優子→黛冬优子，和泉愛依→和泉爱依，浅倉透→浅仓透，
   樋口円香→樋口圆香，福丸小糸→福丸小糸，市川雛菜→市川雏菜，七草にちか→七草日花，
   緋田美琴→绯田美琴；
   イルミネーションスターズ→illumination STARS，アンティーカ→L'Antica，
   放課後クライマックスガールズ→放课后Climax Girls，アルストロメリア→ALSTROEMERIA，
   ストレイライト→Straylight，ノクチル→noctchill，シーズ→SHHis。
`.trim();

export interface StoryRowRecord {
  index: number;
  id: string;
  name: string;
  text: string;
  trans: string;
}

export interface ParsedInputStory {
  infoPath: string;
  rows: StoryRowRecord[];
}

export interface GlossaryEntry {
  jp: string;
  zh: string;
}

export interface CharacterExample {
  speaker: string;
  jp: string;
  zh: string;
}

export type LlmTranslateFn = (systemPrompt: string, userPrompt: string) => Promise<string>;

export function parseInputStoryCsv(csvText: string, fallbackPath = 'unknown/story.json'): ParsedInputStory {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  let infoPath = normalizeStoryPath(fallbackPath);
  const rows: StoryRowRecord[] = [];

  for (const row of parsed.data) {
    const id = trimSpaces(row.id);
    const name = trimSpaces(row.name);
    const text = row.text ?? '';
    const trans = row.trans ?? '';
    if (id === 'info') {
      if (name) infoPath = normalizeStoryPath(name);
      continue;
    }
    if (id === '译者' || id === 'translator') continue;
    if (!text.trim()) continue;
    rows.push({
      index: rows.length,
      id: id || '0000000000000',
      name,
      text,
      trans,
    });
  }

  return { infoPath, rows };
}

export function extractRelevantGlossary(
  rootDir: string,
  storyTextCombined: string,
  limit = 35,
): GlossaryEntry[] {
  const candidates = [
    path.join(rootDir, 'data', 'upstream', 'phrase.csv'),
    path.join(rootDir, 'data', 'upstream', 'etc', 'item.csv'),
    path.join(rootDir, 'data', 'upstream', 'name.csv'),
  ];
  const found: GlossaryEntry[] = [];
  const seen = new Set<string>();

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const parsed = Papa.parse<Record<string, string>>(readTextUtf8(file), {
      header: true,
      skipEmptyLines: true,
    });
    for (const row of parsed.data) {
      const jp = trimSpaces(row.text ?? row.name);
      const zh = trimSpaces(row.trans);
      if (!jp || !zh || jp.length < 2 || jp.length > 20 || seen.has(jp)) continue;
      if (storyTextCombined.includes(jp)) {
        seen.add(jp);
        found.push({ jp, zh });
        if (found.length >= limit) return found;
      }
    }
  }
  return found;
}

export function collectSpeakerExamples(
  rootDir: string,
  speakers: readonly string[],
  maxExamples = 12,
): CharacterExample[] {
  const storyRoot = path.join(rootDir, 'data', 'upstream', 'story');
  if (!fs.existsSync(storyRoot) || speakers.length === 0) return [];

  const targetSpeakers = new Set(speakers.filter((s) => s && s !== 'プロデューサー'));
  if (targetSpeakers.size === 0) return [];

  const examples: CharacterExample[] = [];
  const files = walkFiles(storyRoot).filter((f) => f.toLowerCase().endsWith('.csv'));
  // Scan a bounded sample to stay fast even with 5600+ upstream files
  const stride = Math.max(1, Math.floor(files.length / 180));

  for (let i = 0; i < files.length && examples.length < maxExamples; i += stride) {
    const content = readTextUtf8(files[i]);
    let hitsAny = false;
    for (const sp of targetSpeakers) {
      if (content.includes(`,${sp},`)) {
        hitsAny = true;
        break;
      }
    }
    if (!hitsAny) continue;

    const parsed = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true,
    });
    let takenFromFile = 0;
    for (const row of parsed.data) {
      const sp = trimSpaces(row.name);
      const jp = trimSpaces(row.text);
      const zh = trimSpaces(row.trans);
      if (!sp || !jp || !zh || !targetSpeakers.has(sp)) continue;
      examples.push({ speaker: sp, jp, zh });
      takenFromFile += 1;
      if (takenFromFile >= 3 || examples.length >= maxExamples) break;
    }
  }

  return examples;
}

export function buildTranslationPrompt(options: {
  story: ParsedInputStory;
  glossary: readonly GlossaryEntry[];
  examples: readonly CharacterExample[];
  retryIssues?: readonly LintIssue[];
  previousTranslations?: ReadonlyMap<number, string>;
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = [
    '你是《偶像大师 闪耀色彩》（THE iDOLM@STER SHINY COLORS）的专业日译中剧情译者。',
    '请严格遵守以下社区翻译规范，结合上下文整段自然流畅地翻译每一句台词与选项：',
    COMMUNITY_STYLE_GUIDE,
    '',
    '输出格式要求（极其重要）：',
    '- 仅输出一个 JSON 对象，不要包含 Markdown 代码块或任何额外解释文字。',
    '- JSON 格式：{"translations": [{"index": 0, "trans": "中文译文"}, ...]}',
    '- 必须覆盖输入中所有 index，保留与原文相适应的换行（使用 \\n 字符，不要擅自合并或遗漏台词）。',
  ].join('\n');

  const sections: string[] = [];
  sections.push(`剧情路径：${options.story.infoPath}`);

  if (options.glossary.length > 0) {
    sections.push(
      '本篇命中的官方/社区术语参考：\n' +
        options.glossary.map((g) => `- ${g.jp} => ${g.zh}`).join('\n'),
    );
  }

  if (options.examples.length > 0) {
    sections.push(
      '相关角色已有社区人工译文范例（请保持人称、语气与对制作人称呼一致）：\n' +
        options.examples.map((e) => `- [${e.speaker}] ${e.jp} => ${e.zh}`).join('\n'),
    );
  }

  const linesPayload = options.story.rows.map((r) => ({
    index: r.index,
    type: r.id === 'select' ? 'select' : 'line',
    speaker: r.name,
    text: decodeCsvNewlines(r.text, false),
    ...(options.previousTranslations?.has(r.index)
      ? { prevTrans: options.previousTranslations.get(r.index) }
      : {}),
  }));

  sections.push('待翻译剧情列表（JSON）：\n' + JSON.stringify(linesPayload, null, 2));

  if (options.retryIssues && options.retryIssues.length > 0) {
    sections.push(
      '上一轮译文触发了以下社区规范检查问题，请重点修正对应行并重新输出完整 translations JSON：\n' +
        options.retryIssues
          .map((iss) => `- 第 ${iss.line} 行 [${iss.rule}] ${iss.message}`)
          .join('\n'),
    );
  }

  return {
    systemPrompt,
    userPrompt: sections.join('\n\n'),
  };
}

export function parseLlmTranslations(rawResponse: string): Map<number, string> {
  const trimmed = rawResponse.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonStr = fenced ? fenced[1].trim() : trimmed;
  const parsed = JSON.parse(jsonStr) as {
    translations?: Array<{ index: number; trans: string }>;
  };

  if (!parsed || !Array.isArray(parsed.translations)) {
    throw new Error('LLM output does not contain "translations" array');
  }

  const map = new Map<number, string>();
  for (const item of parsed.translations) {
    if (typeof item.index === 'number' && typeof item.trans === 'string') {
      map.set(item.index, item.trans);
    }
  }
  return map;
}

export function renderTranslatedCsv(
  story: ParsedInputStory,
  translations: ReadonlyMap<number, string>,
  modelName: string,
): string {
  const outRows = story.rows.map((r) => ({
    id: r.id,
    name: r.name,
    text: r.text,
    trans: encodeCsvNewlines(translations.get(r.index) ?? r.trans ?? ''),
  }));

  outRows.push({ id: 'info', name: story.infoPath, text: '', trans: '' });
  outRows.push({ id: '译者', name: `AI(${modelName})`, text: '', trans: '' });

  return (
    Papa.unparse(outRows, {
      columns: ['id', 'name', 'text', 'trans'],
      newline: '\n',
    }) + '\n'
  );
}

export function createEnvLlmClient(modelName: string): LlmTranslateFn {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey) {
    return async (systemPrompt: string, userPrompt: string) => {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        }),
      });
      if (!res.ok) {
        throw new Error(`Gemini API HTTP ${res.status}: ${await res.text()}`);
      }
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Gemini API returned empty response');
      return text;
    };
  }

  if (openaiKey) {
    const baseUrl = (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/+$/, '');
    return async (systemPrompt: string, userPrompt: string) => {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          temperature: 0.3,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
      if (!res.ok) {
        throw new Error(`OpenAI-compatible API HTTP ${res.status}: ${await res.text()}`);
      }
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('OpenAI-compatible API returned empty response');
      return text;
    };
  }

  throw new Error(
    'Missing LLM API key. Set GEMINI_API_KEY or OPENAI_API_KEY in environment variables (never commit keys).',
  );
}

export async function translateStoryCsv(options: {
  rootDir: string;
  csvText: string;
  fallbackPath?: string;
  modelName: string;
  llm?: LlmTranslateFn;
  maxRetries?: number;
}): Promise<{
  infoPath: string;
  csv: string;
  issues: LintIssue[];
  attempts: number;
}> {
  const story = parseInputStoryCsv(options.csvText, options.fallbackPath);
  const combinedText = story.rows.map((r) => r.text).join('\n');
  const speakers = Array.from(new Set(story.rows.map((r) => r.name).filter(Boolean)));
  const glossary = extractRelevantGlossary(options.rootDir, combinedText);
  const examples = collectSpeakerExamples(options.rootDir, speakers);

  const llm = options.llm ?? createEnvLlmClient(options.modelName);
  const maxRetries = options.maxRetries ?? 1;

  let attempts = 0;
  let lastTranslations = new Map<number, string>();
  let lastCsv = '';
  let lastIssues: LintIssue[] = [];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    attempts = attempt + 1;
    const { systemPrompt, userPrompt } = buildTranslationPrompt({
      story,
      glossary,
      examples,
      retryIssues: attempt > 0 ? lastIssues : undefined,
      previousTranslations: attempt > 0 ? lastTranslations : undefined,
    });

    const raw = await llm(systemPrompt, userPrompt);
    lastTranslations = parseLlmTranslations(raw);
    lastCsv = renderTranslatedCsv(story, lastTranslations, options.modelName);
    lastIssues = lintStoryCsvContent(lastCsv, story.infoPath, { requireTranslator: true });

    const hasBlockingOrStyleIssues = lastIssues.length > 0;
    if (!hasBlockingOrStyleIssues) break;
  }

  return {
    infoPath: story.infoPath,
    csv: lastCsv,
    issues: lastIssues,
    attempts,
  };
}

function storyPathToAiOutputFile(rootDir: string, infoPath: string): string {
  const slug = normalizeStoryPath(infoPath)
    .replace(/\.json$/i, '')
    .replace(/[^a-zA-Z0-9/_-]+/g, '_');
  return path.join(rootDir, 'data', 'ai', 'story', `${slug}.csv`);
}

async function runCli(): Promise<void> {
  const args = process.argv.slice(2);
  const inputArg = args.find((a) => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');
  const modelFlag = args.find((a) => a.startsWith('--model='));
  const modelName = modelFlag
    ? modelFlag.slice('--model='.length)
    : process.env.AI_MODEL ?? 'gemini-2.5-flash';
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

  if (!inputArg) {
    console.info(
      'Usage: pnpm run pipeline:ai -- <input.csv | untranslated-bundle.json> [--model=gemini-2.5-flash] [--dry-run]',
    );
    process.exit(1);
  }

  const inputPath = path.resolve(inputArg);
  const entries: Array<{ path: string; csv: string }> = [];

  if (inputPath.toLowerCase().endsWith('.json')) {
    const bundle = JSON.parse(readTextUtf8(inputPath)) as Record<string, string>;
    for (const [storyPath, csv] of Object.entries(bundle)) {
      entries.push({ path: storyPath, csv });
    }
  } else {
    entries.push({ path: path.basename(inputPath), csv: readTextUtf8(inputPath) });
  }

  for (const item of entries) {
    if (dryRun) {
      const story = parseInputStoryCsv(item.csv, item.path);
      const glossary = extractRelevantGlossary(rootDir, story.rows.map((r) => r.text).join('\n'));
      const speakers = Array.from(new Set(story.rows.map((r) => r.name).filter(Boolean)));
      const examples = collectSpeakerExamples(rootDir, speakers);
      console.info(
        `[pipeline:ai dry-run] ${story.infoPath}: ${story.rows.length} rows, ${glossary.length} glossary hits, ${examples.length} character examples`,
      );
      continue;
    }

    console.info(`[pipeline:ai] Translating ${item.path} with model=${modelName}...`);
    const result = await translateStoryCsv({
      rootDir,
      csvText: item.csv,
      fallbackPath: item.path,
      modelName,
    });

    const outFile = storyPathToAiOutputFile(rootDir, result.infoPath);
    writeTextUtf8(outFile, result.csv);
    console.info(
      `[pipeline:ai] Saved ${path.relative(rootDir, outFile)} (attempts=${result.attempts}, lintIssues=${result.issues.length})`,
    );
  }
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  void runCli();
}
