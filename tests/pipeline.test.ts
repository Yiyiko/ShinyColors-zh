import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildDataDist } from '../pipeline/build';
import { lintStoryCsvContent } from '../pipeline/lint';
import { mergeStoryLayers } from '../pipeline/merge';

describe('P4 translation data pipeline', () => {
  const tmpDirs: string[] = [];

  const makeTmp = (): string => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sczh-pipe-'));
    tmpDirs.push(dir);
    return dir;
  };

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('enforces upstream > local > ai priority and flags superseded AI stories', () => {
    const root = makeTmp();
    const write = (rel: string, content: string) => {
      const full = path.join(root, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content, 'utf8');
    };

    const mkStory = (info: string, translator: string, line: string) =>
      `id,name,text,trans\n1000000000001,真乃,おはよう,${line}\ninfo,${info},,\n译者,${translator},,\n`;

    // Same story exists in upstream, local, and ai -> upstream wins, ai flagged superseded
    write('data/upstream/story/真乃/s1.csv', mkStory('mypage_communications/101.json', '社区译者', '社区版'));
    write('data/local/story/真乃/s1.csv', mkStory('mypage_communications/101.json', '本地译者', '本地版'));
    write('data/ai/story/真乃/s1.csv', mkStory('mypage_communications/101.json', 'AI(Gemini)', 'AI版'));

    // Story exists only in local and ai -> local wins, ai flagged superseded
    write('data/local/story/灯织/s2.csv', mkStory('mypage_communications/102.json', '本地译者', '本地独家'));
    write('data/ai/story/灯织/s2.csv', mkStory('mypage_communications/102.json', 'AI(Gemini)', 'AI被覆盖'));

    // Story exists only in ai -> ai kept with isAI=true
    write('data/ai/story/巡/s3.csv', mkStory('mypage_communications/103.json', 'AI(Gemini)', 'AI补译'));

    const merged = mergeStoryLayers({
      upstreamDir: path.join(root, 'data/upstream'),
      localDir: path.join(root, 'data/local'),
      aiDir: path.join(root, 'data/ai'),
      baseDir: root,
    });

    expect(merged.stories.size).toBe(3);
    expect(merged.stories.get('mypage_communications/101.json')?.tier).toBe('upstream');
    expect(merged.stories.get('mypage_communications/101.json')?.isAI).toBe(false);
    expect(merged.stories.get('mypage_communications/102.json')?.tier).toBe('local');
    expect(merged.stories.get('mypage_communications/103.json')?.tier).toBe('ai');
    expect(merged.stories.get('mypage_communications/103.json')?.isAI).toBe(true);
    expect(merged.supersededAi).toHaveLength(2);
  });

  it('lints CSV structure errors and style-guide punctuation/length warnings', () => {
    const badCsv = [
      'id,name,text,trans',
      '1000000000001,真乃,おはよう,『你好』...真乃酱~八宮めぐる是一段超过了十七个字的台词测试行',
      'select,,はい,这个选项明显超过了十一个字限制',
    ].join('\n');

    const issues = lintStoryCsvContent(badCsv, 'bad.csv', { requireTranslator: true });
    const rules = issues.map((i) => i.rule);

    expect(rules).toContain('missing-info');
    expect(rules).toContain('missing-translator');
    expect(rules).toContain('punct-quotes');
    expect(rules).toContain('punct-tilde');
    expect(rules).toContain('punct-ellipsis');
    expect(rules).toContain('honorific-style');
    expect(rules).toContain('canonical-name');
    expect(rules).toContain('text-line-length');
    expect(rules).toContain('select-line-length');

    const goodCsv = [
      'id,name,text,trans',
      '1000000000001,真乃,おはよう,“早上好”……八宫巡～',
      'select,,はい,好的',
      'info,mypage_communications/101.json,,',
      '译者,测试译者,,',
    ].join('\n');
    expect(lintStoryCsvContent(goodCsv, 'good.csv')).toHaveLength(0);
  });

  it('builds dist/ manifest, story-index, merged type-text, and preserves userscript', () => {
    const root = makeTmp();
    const write = (rel: string, content: string) => {
      const full = path.join(root, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content, 'utf8');
    };

    write('package.json', JSON.stringify({ version: '0.2.0' }));
    write('dist/ShinyColors-zh.user.js', '// existing userscript');
    write('data/upstream/.upstream-meta.json', JSON.stringify({ commit: 'abc12345' }));
    write(
      'data/upstream/story/s1.csv',
      'id,name,text,trans\n1000000000001,真乃,おはよう,早上好\ninfo,produce_events/1.json,,\n译者,社区,,\n',
    );
    write(
      'data/ai/story/s2.csv',
      'id,name,text,trans\n1000000000002,灯织,こんばんは,晚上好\ninfo,produce_events/2.json,,\n译者,AI(Gemini),,\n',
    );
    write('data/upstream/phrase.csv', 'id,text,trans\nhome.title,ホーム,主页\n');
    write('data/local/phrase.csv', 'id,text,trans\nhome.title,ホーム,本地不应覆盖上游\nextra.key,テスト,测试\n');
    write('data/upstream/type-text/mano.csv', 'text,trans\n頑張ろう,加油\n');
    write('data/upstream/type-text.csv', 'text,trans\nよろしく,请多关照\n');

    const { manifest, report } = buildDataDist({ rootDir: root });

    expect(manifest.version).toBe('0.2.0');
    expect(manifest.upstreamCommit).toBe('abc12345');
    expect(report.stats.stories).toBe(2);
    expect(report.stats.aiStories).toBe(1);

    // Existing userscript must be preserved
    expect(fs.existsSync(path.join(root, 'dist/ShinyColors-zh.user.js'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'dist/manifest.json'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'dist/story-index.json'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'dist/index.html'))).toBe(true);

    const storyIndex = JSON.parse(fs.readFileSync(path.join(root, 'dist/story-index.json'), 'utf8'));
    expect(storyIndex).toHaveLength(2);
    expect(storyIndex[0][0]).toBe('produce_events/1.json');
    expect(storyIndex[1][0]).toBe('produce_events/2.json');
    expect(storyIndex[1][2]).toBe(true);

    // Phrase merge respected upstream > local while adding local-only extra.key
    const phraseCsv = fs.readFileSync(path.join(root, 'dist/data/phrase.csv'), 'utf8');
    expect(phraseCsv).toContain('home.title,ホーム,主页');
    expect(phraseCsv).toContain('extra.key,テスト,测试');

    // Type-text merged sub-files + root file
    const typeTextCsv = fs.readFileSync(path.join(root, 'dist/data/type-text.csv'), 'utf8');
    expect(typeTextCsv).toContain('頑張ろう,加油');
    expect(typeTextCsv).toContain('よろしく,请多关照');
  });
});
