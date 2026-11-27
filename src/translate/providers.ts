import { getMtPreset, type MtConfig } from './config';
import { defaultMtHttpClient, type MtHttpClient } from './http';

export interface TranslateLineInput {
  text: string;
  speaker?: string;
}

export interface ProviderTranslateOptions {
  config: MtConfig;
  lines: readonly TranslateLineInput[];
  http?: MtHttpClient;
}

const DEFAULT_SYSTEM_PROMPT = [
  '你是《偶像大师 闪耀色彩》（THE iDOLM@STER SHINY COLORS）的专业日译中本地化译者。',
  '请将用户提供的日文台词数组逐条翻译为自然、贴合角色性格与口癖的简体中文。',
  '规则：',
  '1. 常用译名：プロデューサー→制作人，283プロ→283事务所，櫻木真乃→樱木真乃，風野灯織→风野灯织，八宮めぐる→八宫巡，月岡恋鐘→月冈恋钟，田中摩美々→田中摩美美，白瀬咲耶→白濑咲耶，三峰結華→三峰结华，幽谷霧子→幽谷雾子，小宮果穂→小宫果穗，園田智代子→园田智代子，西城樹里→西城树里，杜野凛世→杜野凛世，有栖川夏葉→有栖川夏叶，大崎甘奈→大崎甘奈，大崎甜花→大崎甜花，桑山千雪→桑山千雪，芹沢あさひ→芹泽朝日，黛冬優子→黛冬优子，和泉愛依→和泉爱依，浅倉透→浅仓透，樋口円香→樋口圆香，福丸小糸→福丸小糸，市川雛菜→市川雏菜，七草にちか→七草日花，緋田美琴→绯田美琴，斑鳩ルカ→斑鸠路加，鈴木羽那→铃木羽那，郁田はるき→郁田春希，はづき→叶月。',
  '2. 尽量保留原文的换行符 \\n 节奏，不要合并或删减条目。',
  '3. 严格只输出一个 JSON 字符串数组（例如 ["译文1","译文2"]），数组长度必须与输入条数完全一致，不要包含 Markdown 代码块或任何解释。',
].join('\n');

const FREE_POST_REPLACEMENTS: ReadonlyArray<[RegExp, string]> = [
  [/制片人/g, '制作人'],
  [/生产商/g, '制作人'],
  [/生产者/g, '制作人'],
  [/283\s*Pro/gi, '283事务所'],
  [/樱木真野/g, '樱木真乃'],
  [/风野灯织|风野绯织/g, '风野灯织'],
  [/八宫巡|八宫惠/g, '八宫巡'],
  [/月冈恋钟|月冈小金/g, '月冈恋钟'],
  [/田中真美美|田中麻美/g, '田中摩美美'],
  [/七草日花|七草妮可|七草日香/g, '七草日花'],
  [/斑鸠卢卡|斑鸠露卡/g, '斑鸠路加'],
  [/铃木花|铃木羽奈/g, '铃木羽那'],
  [/郁田春树/g, '郁田春希'],
  [/黛冬子/g, '黛冬优子'],
];

function applyShinyTermsFix(text: string): string {
  let out = text;
  for (const [re, rep] of FREE_POST_REPLACEMENTS) {
    out = out.replace(re, rep);
  }
  return out.trim();
}

function buildUserPayload(lines: readonly TranslateLineInput[]): string {
  const arr = lines.map((l, idx) => ({
    i: idx,
    s: l.speaker || '',
    t: l.text,
  }));
  return `请按顺序翻译以下 ${lines.length} 条台词，只返回长度为 ${lines.length} 的 JSON 字符串数组：\n${JSON.stringify(arr)}`;
}

/**
 * Extracts a string array from an LLM response (supports raw JSON array, fenced JSON,
 * or `{ translations: [...] }` wrapper).
 */
export function parseLlmArrayResponse(raw: string, expectedLength: number): string[] {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const tryParse = (candidate: string): string[] | null => {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (Array.isArray(parsed) && parsed.length === expectedLength) {
        return parsed.map((v) => {
          if (typeof v === 'string') return v;
          if (v && typeof v === 'object' && 't' in v && typeof (v as { t: unknown }).t === 'string') {
            return (v as { t: string }).t;
          }
          return String(v ?? '');
        });
      }
      if (parsed && typeof parsed === 'object') {
        for (const val of Object.values(parsed as Record<string, unknown>)) {
          if (Array.isArray(val) && val.length === expectedLength) {
            return val.map((x) => String(x ?? ''));
          }
        }
      }
    } catch {
      // fall through
    }
    return null;
  };

  const direct = tryParse(cleaned);
  if (direct) return direct;

  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    const sliced = tryParse(cleaned.slice(firstBracket, lastBracket + 1));
    if (sliced) return sliced;
  }

  // Single-line fallback
  if (expectedLength === 1 && cleaned.length > 0) {
    return [cleaned.replace(/^["']|["']$/g, '')];
  }

  throw new Error(`LLM 返回格式无法解析为长度为 ${expectedLength} 的 JSON 数组`);
}

function normalizeOpenAiEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (/\/chat\/completions$/i.test(trimmed)) return trimmed;
  if (/\/v1$/i.test(trimmed)) return `${trimmed}/chat/completions`;
  return trimmed;
}

export async function translateWithOpenAiCompat(options: ProviderTranslateOptions): Promise<string[]> {
  const { config, lines } = options;
  const http = options.http ?? defaultMtHttpClient;
  const preset = getMtPreset(config.provider);
  if (preset.requiresKey && !config.apiKey) {
    throw new Error(`${preset.label} 尚未填写 API Key`);
  }

  const url = normalizeOpenAiEndpoint(config.baseUrl || preset.defaultBaseUrl);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }
  if (config.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://shinycolors.enza.fun/';
    headers['X-Title'] = 'ShinyColors-zh';
  }

  const systemPrompt = config.customPrompt.trim() || DEFAULT_SYSTEM_PROMPT;
  const body = JSON.stringify({
    model: config.model || preset.defaultModel,
    temperature: 0.3,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: buildUserPayload(lines) },
    ],
  });

  const res = await http({
    url,
    method: 'POST',
    headers,
    body,
    timeoutMs: config.timeoutMs,
  });

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`OpenAI 兼容接口 HTTP ${res.status}: ${res.text.slice(0, 180)}`);
  }

  const data = JSON.parse(res.text) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI 兼容接口返回内容为空');
  }
  return parseLlmArrayResponse(content, lines.length);
}

export async function translateWithGemini(options: ProviderTranslateOptions): Promise<string[]> {
  const { config, lines } = options;
  const http = options.http ?? defaultMtHttpClient;
  if (!config.apiKey) {
    throw new Error('Google Gemini 尚未填写 API Key');
  }

  const base = (config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
  const model = (config.model || 'gemini-2.5-flash').replace(/^models\//, '');
  const url = `${base}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
  const systemPrompt = config.customPrompt.trim() || DEFAULT_SYSTEM_PROMPT;

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: buildUserPayload(lines) }] }],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
    },
  });

  const res = await http({
    url,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    timeoutMs: config.timeoutMs,
  });

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Gemini API HTTP ${res.status}: ${res.text.slice(0, 180)}`);
  }

  const data = JSON.parse(res.text) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!content.trim()) {
    throw new Error('Gemini API 返回内容为空');
  }
  return parseLlmArrayResponse(content, lines.length);
}

export async function translateWithCaiyun(options: ProviderTranslateOptions): Promise<string[]> {
  const { config, lines } = options;
  const http = options.http ?? defaultMtHttpClient;
  if (!config.apiKey) {
    throw new Error('彩云小译尚未填写 Token');
  }

  const url = config.baseUrl || 'https://api.interpreter.caiyunai.com/v1/translator';
  const res = await http({
    url,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-authorization': `token ${config.apiKey}`,
    },
    body: JSON.stringify({
      source: lines.map((l) => l.text),
      trans_type: config.model || 'ja2zh',
      request_id: `sczh-${Date.now()}`,
      detect: false,
    }),
    timeoutMs: config.timeoutMs,
  });

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`彩云小译 HTTP ${res.status}: ${res.text.slice(0, 180)}`);
  }

  const data = JSON.parse(res.text) as { target?: string[] };
  if (!Array.isArray(data.target) || data.target.length !== lines.length) {
    throw new Error('彩云小译返回数组长度不匹配');
  }
  return data.target.map(applyShinyTermsFix);
}

/**
 * Zero-key fallback using Google Translate public NMT endpoint.
 * Packs lines with a resilient numeric tag delimiter so batch translation completes in 1-2 requests.
 */
export async function translateWithFreeGoogle(options: ProviderTranslateOptions): Promise<string[]> {
  const { config, lines } = options;
  const http = options.http ?? defaultMtHttpClient;
  const endpoint = (config.provider === 'free-google' && config.baseUrl)
    ? config.baseUrl
    : 'https://translate.googleapis.com/translate_a/single';

  const translateSingle = async (text: string): Promise<string> => {
    const q = encodeURIComponent(text);
    const url = `${endpoint}?client=gtx&sl=ja&tl=zh-CN&dt=t&q=${q}`;
    const res = await http({ url, method: 'GET', timeoutMs: config.timeoutMs });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`免费保底翻译 HTTP ${res.status}`);
    }
    const parsed = JSON.parse(res.text) as unknown[];
    const segments = Array.isArray(parsed[0]) ? (parsed[0] as unknown[][]) : [];
    const joined = segments.map((seg) => (typeof seg?.[0] === 'string' ? seg[0] : '')).join('');
    return applyShinyTermsFix(joined || text);
  };

  if (lines.length === 1) {
    return [await translateSingle(lines[0].text)];
  }

  // Pack lines into <= 1600 char batches separated by unique line-safe markers
  const out: string[] = new Array(lines.length);
  let cursor = 0;
  while (cursor < lines.length) {
    const batchIdx: number[] = [];
    const parts: string[] = [];
    let charCount = 0;
    while (cursor < lines.length) {
      const encoded = lines[cursor].text.replace(/\r?\n/g, ' ⏎ ');
      const piece = `【${cursor}】${encoded}`;
      if (batchIdx.length > 0 && charCount + piece.length > 1400) break;
      batchIdx.push(cursor);
      parts.push(piece);
      charCount += piece.length + 1;
      cursor += 1;
    }

    const joinedQuery = parts.join('\n');
    const url = `${endpoint}?client=gtx&sl=ja&tl=zh-CN&dt=t&q=${encodeURIComponent(joinedQuery)}`;
    const res = await http({ url, method: 'GET', timeoutMs: config.timeoutMs });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`免费保底翻译 HTTP ${res.status}`);
    }
    const parsed = JSON.parse(res.text) as unknown[];
    const segments = Array.isArray(parsed[0]) ? (parsed[0] as unknown[][]) : [];
    const mergedText = segments.map((seg) => (typeof seg?.[0] === 'string' ? seg[0] : '')).join('');

    // Parse back by 【idx】 marker
    const matched = new Map<number, string>();
    const markerRe = /【\s*(\d+)\s*】([\s\S]*?)(?=【\s*\d+\s*】|$)/g;
    let m: RegExpExecArray | null;
    while ((m = markerRe.exec(mergedText)) !== null) {
      const idx = Number(m[1]);
      const val = applyShinyTermsFix(m[2].replace(/\s*⏎\s*/g, '\n'));
      matched.set(idx, val);
    }

    for (const idx of batchIdx) {
      const hit = matched.get(idx);
      if (hit) {
        out[idx] = hit;
      } else {
        out[idx] = await translateSingle(lines[idx].text);
      }
    }
  }

  return out;
}

export async function dispatchProviderTranslate(
  options: ProviderTranslateOptions,
): Promise<string[]> {
  const preset = getMtPreset(options.config.provider);
  const chunkSize = preset.protocol === 'free-google' || preset.protocol === 'caiyun' ? 40 : 25;
  if (options.lines.length <= chunkSize) {
    return runSingleChunk(preset.protocol, options);
  }

  const results: string[] = [];
  for (let i = 0; i < options.lines.length; i += chunkSize) {
    const slice = options.lines.slice(i, i + chunkSize);
    const translated = await runSingleChunk(preset.protocol, {
      ...options,
      lines: slice,
    });
    results.push(...translated);
  }
  return results;
}

function runSingleChunk(
  protocol: ReturnType<typeof getMtPreset>['protocol'],
  options: ProviderTranslateOptions,
): Promise<string[]> {
  switch (protocol) {
    case 'gemini':
      return translateWithGemini(options);
    case 'openai-compat':
      return translateWithOpenAiCompat(options);
    case 'caiyun':
      return translateWithCaiyun(options);
    case 'free-google':
    default:
      return translateWithFreeGoogle(options);
  }
}
