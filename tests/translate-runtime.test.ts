import { describe, expect, it, vi } from 'vitest';
import { MemoryCache } from '../src/data/cache-idb';
import {
  createDefaultMtConfig,
  parseLlmArrayResponse,
  RuntimeTranslator,
  type MtHttpClient,
} from '../src/translate';

describe('Runtime machine translation (custom API + free fallback)', () => {
  it('parses raw, fenced, and wrapped JSON array LLM outputs', () => {
    expect(parseLlmArrayResponse('["早上好","你好"]', 2)).toEqual(['早上好', '你好']);
    expect(parseLlmArrayResponse('```json\n["译文1","译文2"]\n```', 2)).toEqual(['译文1', '译文2']);
    expect(parseLlmArrayResponse('结果如下：{"translations":["A","B"]}', 2)).toEqual(['A', 'B']);
  });

  it('calls OpenAI-compatible custom endpoint, caches in IndexedDB/MemoryCache, and skips duplicate calls', async () => {
    const http = vi.fn<MtHttpClient>(async (req) => {
      expect(req.url).toBe('https://api.deepseek.com/v1/chat/completions');
      expect(req.headers?.Authorization).toBe('Bearer sk-test-key');
      return {
        status: 200,
        text: JSON.stringify({
          choices: [{ message: { content: '["早上好，制作人！","出发吧"]' } }],
        }),
      };
    });

    const translator = new RuntimeTranslator({
      cache: new MemoryCache(),
      http,
      config: {
        ...createDefaultMtConfig(),
        provider: 'deepseek',
        baseUrl: 'https://api.deepseek.com/v1',
        apiKey: 'sk-test-key',
        model: 'deepseek-chat',
      },
    });

    const items = [
      { id: '1', speaker: '真乃', text: 'おはようございます、プロデューサーさん！' },
      { select: '行くよ' },
    ];

    const first = await translator.translateStory('produce_events/999.json', items);
    expect(first?.fromCache).toBe(false);
    expect(first?.usedFallback).toBe(false);
    expect(first?.texts.get(0)).toBe('早上好，制作人！');
    expect(first?.selects.get(1)).toBe('出发吧');
    expect(http).toHaveBeenCalledTimes(1);

    // Second call hits cache with zero network requests
    const second = await translator.translateStory('produce_events/999.json', items);
    expect(second?.fromCache).toBe(true);
    expect(second?.texts.get(0)).toBe('早上好，制作人！');
    expect(http).toHaveBeenCalledTimes(1);
  });

  it('falls back to zero-key free Google NMT when custom API fails or API key is empty', async () => {
    const http = vi.fn<MtHttpClient>(async (req) => {
      if (req.url.includes('generativelanguage.googleapis.com')) {
        return { status: 429, text: 'quota exceeded' };
      }
      if (req.url.includes('translate.googleapis.com')) {
        expect(req.method).toBe('POST');
        return {
          status: 200,
          text: JSON.stringify([[['[0] 制片人，Toori早上好\n[1] 283 Pro 加油']]]),
        };
      }
      throw new Error(`unexpected url ${req.url}`);
    });

    const translator = new RuntimeTranslator({
      cache: new MemoryCache(),
      http,
      config: {
        ...createDefaultMtConfig(),
        provider: 'gemini',
        apiKey: 'fake-key',
        model: 'gemini-2.5-flash',
        fallbackToFree: true,
      },
    });

    const res = await translator.translateStory('produce_events/fallback.json', [
      { text: 'プロデューサー、灯織おはよう' },
      { text: '283プロ頑張ろう' },
    ]);
    expect(res?.usedFallback).toBe(true);
    expect(res?.engineLabel).toContain('免费保底');
    // Post-processing fixes 制片人 -> 制作人, Toori -> 灯织, 283 Pro -> 283事务所
    expect(res?.texts.get(0)).toBe('制作人，灯织早上好');
    expect(res?.texts.get(1)).toBe('283事务所 加油');
  });

  it('batch-translates and caches untranslated voice bubbles', async () => {
    const http = vi.fn<MtHttpClient>(async () => ({
      status: 200,
      text: JSON.stringify([[['【0】你好制作人\n【1】今天也很开心']]]),
    }));

    const translator = new RuntimeTranslator({
      cache: new MemoryCache(),
      http,
      config: createDefaultMtConfig(),
    });

    const map1 = await translator.translateVoices(['こんにちはプロデューサー', '今日も楽しいね']);
    expect(map1.get('こんにちはプロデューサー')).toBe('你好制作人');
    expect(map1.get('今日も楽しいね')).toBe('今天也很开心');
    expect(http).toHaveBeenCalledTimes(1);

    const map2 = await translator.translateVoices(['こんにちはプロデューサー']);
    expect(map2.get('こんにちはプロデューサー')).toBe('你好制作人');
    expect(http).toHaveBeenCalledTimes(1);
  });
});
