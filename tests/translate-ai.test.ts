import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildTranslationPrompt,
  extractRelevantGlossary,
  parseInputStoryCsv,
  translateStoryCsv,
} from '../pipeline/translate-ai';

describe('P5 offline AI translation pipeline', () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('extracts matched glossary terms, retries once on lint issues, and outputs compliant AI CSV', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sczh-ai-'));
    tmpDirs.push(root);

    const write = (rel: string, content: string) => {
      const full = path.join(root, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content, 'utf8');
    };

    write('data/upstream/phrase.csv', 'id,text,trans\nunit.1,イルミネーションスターズ,illumination STARS\n');
    write(
      'data/upstream/story/真乃/sample.csv',
      'id,name,text,trans\n1000000000001,真乃,プロデューサーさん！,制作人！\ninfo,mypage_communications/99.json,,\n译者,社区,,\n',
    );

    const inputCsv = [
      'id,name,text,trans',
      '2000000000001,真乃,イルミネーションスターズの練習！,',
      'select,,はい,',
      'info,mypage_communications/999.json,,',
      '译者,,,',
    ].join('\n');

    const parsed = parseInputStoryCsv(inputCsv);
    const glossary = extractRelevantGlossary(root, parsed.rows.map((r) => r.text).join('\n'));
    expect(glossary).toEqual([{ jp: 'イルミネーションスターズ', zh: 'illumination STARS' }]);

    const promptPreview = buildTranslationPrompt({ story: parsed, glossary, examples: [] });
    expect(promptPreview.systemPrompt).toContain('八宮めぐる→八宫巡');
    expect(promptPreview.userPrompt).toContain('illumination STARS');

    // Mock LLM: 1st attempt violates style guide (`『』` and `~`), 2nd attempt fixes it
    const mockLlm = vi
      .fn()
      .mockResolvedValueOnce(
        JSON.stringify({
          translations: [
            { index: 0, trans: '『illumination STARS』的练习~' },
            { index: 1, trans: '好的' },
          ],
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          translations: [
            { index: 0, trans: '“illumination STARS”的练习～' },
            { index: 1, trans: '好的' },
          ],
        }),
      );

    const result = await translateStoryCsv({
      rootDir: root,
      csvText: inputCsv,
      modelName: 'gemini-2.5-flash',
      llm: mockLlm,
      maxRetries: 1,
    });

    expect(mockLlm).toHaveBeenCalledTimes(2);
    expect(result.attempts).toBe(2);
    expect(result.issues).toHaveLength(0);
    expect(result.csv).toContain('2000000000001,真乃,イルミネーションスターズの練習！,“illumination STARS”的练习～');
    expect(result.csv).toContain('info,mypage_communications/999.json,,');
    expect(result.csv).toContain('译者,AI(gemini-2.5-flash),,');
  });
});
