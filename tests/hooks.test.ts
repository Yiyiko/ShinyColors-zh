import { describe, expect, it, vi } from 'vitest';
import { MemoryCache } from '../src/data/cache-idb';
import { DataRepository } from '../src/data/repository';
import { StoryEditorStore } from '../src/dev/story-editor';
import {
  installApiHook,
  installPhraseHook,
  installResourceHook,
  installStoryHook,
  installTextHook,
} from '../src/hooks';
import type { LocateResult, ModuleName } from '../src/locator';
import { DiagnosticsStore } from '../src/ui/diagnostics-panel';

function createMockRepo(): DataRepository {
  const files: Record<string, string> = {
    'manifest.json': JSON.stringify({
      version: '0.2.0',
      generatedAt: '2026-11-27T00:00:00Z',
      upstreamCommit: 'dce16464',
      files: {
        'story-index.json': 'h_idx',
        'picture.json': 'h_pic',
        'data/phrase.csv': 'h_phr',
        'data/common.csv': 'h_com',
        'data/type-text.csv': 'h_typ',
        'data/comm-story.csv': 'h_cst',
        'data/name.csv': 'h_nam',
        'data/etc/idol-name.csv': 'h_idn',
        'data/etc/mission.csv': 'h_mis',
        'data/etc/item.csv': 'h_itm',
        'data/skill.csv': 'h_skl',
        'data/title.csv': 'h_ttl',
        'data/etc/image.csv': 'h_img',
        'data/image/album_parts.webp': 'h_img1',
        'data/picture/card/1.jpg': 'h_pic1',
      },
    }),
    'story-index.json': JSON.stringify([['mypage_communications/1001.json', 'abcd1234']]),
    'picture.json': JSON.stringify([['card/1.jpg', 'h_pic1']]),
    'data/story/abcd1234.csv': [
      'id,name,text,trans',
      '1001000000001,真乃,おはよう,早上好',
      'select,,行く,出发',
      'info,mypage_communications/1001.json,,',
      '译者,测试译者,,',
    ].join('\n'),
    'data/phrase.csv': 'id,text,trans\nhome.btn,ホーム,主页\n',
    'data/common.csv': 'text,trans\n昇格ライン,升格分数线\n',
    'data/type-text.csv': 'text,trans\n頑張ろう！,加油！\n',
    'data/comm-story.csv': 'text,trans\nお疲れ様,辛苦了\n',
    'data/name.csv': 'name,trans\nプロデューサー,制作人\n真乃,真乃\n',
    'data/etc/idol-name.csv': 'name,trans\n櫻木真乃,樱木真乃\n',
    'data/etc/mission.csv': 'text,trans,type\nフェスをプレイしよう,进行1次Fes,text\n',
    'data/etc/item.csv': 'text,trans,type\nキーホルダー,钥匙链,text\n',
    'data/skill.csv': 'text,trans,type\nVocal,Vo,noun\n$noun$percentUP,$1提升$2,\n',
    'data/title.csv': 'text,trans,type\nW.I.N.G.編,W.I.N.G.篇,text\n',
    'data/etc/image.csv': 'name,url,version\nimages/ui/album/parts.json_image,album_parts.png,19\n',
  };

  return new DataRepository({
    cache: new MemoryCache(),
    customSource: 'https://mock.local/',
    fetcher: async (url: string) => {
      const clean = url.replace('https://mock.local/', '').split('?')[0];
      if (clean in files) return files[clean];
      throw new Error(`404 ${clean}`);
    },
  });
}

function makeModules(overrides: Partial<Record<ModuleName, unknown>> = {}): Record<ModuleName, LocateResult> {
  const names: ModuleName[] = [
    'AOBA',
    'SCENARIO',
    'SCENARIO_WRAPPER',
    'PHRASE',
    'WEBP',
    'TRACK_MANAGER',
    'ASSET_MAP',
    'API_CLIENT',
  ];
  const out = {} as Record<ModuleName, LocateResult>;
  for (const name of names) {
    const value = overrides[name] ?? null;
    out[name] = { name, id: value ? '100' : null, value, source: value ? 'hint' : 'not-found' };
  }
  return out;
}

describe('P3 feature hooks end-to-end with mock game modules', () => {
  it('installs story hook, translates lines/select/speaker, updates diagnostics and supports export', async () => {
    const repo = createMockRepo();
    const diag = new DiagnosticsStore();
    const editor = new StoryEditorStore();
    const scenario = {
      load: vi.fn(async (_p: string) => [
        { id: '1001000000001', speaker: '真乃', text: 'おはよう' },
        { speaker: 'プロデューサー', text: 'お疲れ様' },
        { select: '行く' },
      ]),
    };

    const res = installStoryHook({
      modules: makeModules({ SCENARIO: scenario }),
      repo,
      diag,
      editor,
      showStoryHints: false,
    });
    expect(res.status).toBe('ok');

    const loaded = (await scenario.load('/assets/json/mypage_communications/1001.json')) as any[];
    expect(loaded[0].text).toBe('\u200c早上好');
    expect(loaded[1].speaker).toBe('制作人');
    expect(loaded[1].text).toBe('\u200c辛苦了');
    expect(loaded[2].select).toBe('出发');

    const snap = diag.getSnapshot();
    expect(snap.lastStory?.coveragePct).toBe(100);
    expect(snap.lastStory?.translator).toBe('测试译者');

    const exported = editor.exportLastStoryCsv('测试译者');
    expect(exported?.content).toContain('info,mypage_communications/1001.json,,');
  });

  it('installs phrase hook safely before init() is called', async () => {
    const repo = createMockRepo();
    const diag = new DiagnosticsStore();
    const editor = new StoryEditorStore();
    let initializedPhrases: Record<string, string> = {};
    const phraseMod = {
      _polyglot: null,
      init(phrases: Record<string, string>) {
        initializedPhrases = phrases;
      },
    };

    const res = await installPhraseHook({
      modules: makeModules({ PHRASE: phraseMod }),
      repo,
      diag,
      editor,
    });
    expect(res.status).toBe('ok');

    phraseMod.init({ 'home.btn': 'ホーム', 'other.key': 'その他' });
    expect(initializedPhrases['home.btn']).toBe('主页');
    expect(initializedPhrases['other.key']).toBe('その他');
  });

  it('installs text hook with typewriter frame protection', async () => {
    const repo = createMockRepo();
    const diag = new DiagnosticsStore();
    const editor = new StoryEditorStore();
    const receivedType: string[] = [];
    const renderedStatic: string[] = [];

    class FakeText {
      _text = '';
      typeText(t: string) {
        receivedType.push(t);
      }
      updateText() {
        renderedStatic.push(this._text);
      }
    }

    const res = await installTextHook({
      modules: makeModules({ AOBA: { Text: FakeText } }),
      repo,
      diag,
      editor,
    });
    expect(res.status).toBe('ok');

    const inst = new FakeText();
    inst.typeText('頑張ろう！');
    expect(receivedType[0]).toBe('加油！');

    inst._text = '昇格ライン';
    inst.updateText();
    expect(renderedStatic[0]).toBe('升格分数线');
  });

  it('installs resource hook and rewrites matched UI image & picture URLs', async () => {
    const repo = createMockRepo();
    const diag = new DiagnosticsStore();
    const editor = new StoryEditorStore();
    const loadedUrls: string[] = [];

    class FakeResource {
      name = '';
      url = '';
      crossOrigin: string | boolean = false;
      _loadElement(_type: string) {
        loadedUrls.push(this.url);
      }
    }

    const webp = {
      isSupportedWebP: () => true,
      toWebPUrl: (p: string) => p.replace(/\.png$/, '.webp'),
    };

    const res = await installResourceHook({
      modules: makeModules({ AOBA: { loaders: { Resource: FakeResource } }, WEBP: webp }),
      repo,
      diag,
      editor,
    });
    expect(res.status).toBe('ok');

    const r1 = new FakeResource();
    r1.name = 'images/ui/album/parts.json_image';
    r1.url = '/assets/abc?v=19';
    r1._loadElement('image');
    expect(loadedUrls[0]).toBe('https://mock.local/data/image/album_parts.webp?v=h_img1');
    expect(r1.crossOrigin).toBe('anonymous');

    const r2 = new FakeResource();
    r2.name = 'images/card/1.jpg';
    r2.url = '/assets/xyz';
    r2._loadElement('image');
    expect(loadedUrls[1]).toBe('https://mock.local/data/picture/card/1.jpg?v=h_pic1');
  });

  it('installs api hook on queue push and translates mission/item/skill/title responses', async () => {
    const repo = createMockRepo();
    const diag = new DiagnosticsStore();
    const editor = new StoryEditorStore();
    const fakeProto = { push: Array.prototype.push };

    const res = installApiHook(
      { modules: makeModules(), repo, diag, editor },
      { targetArrayProto: fakeProto },
    );
    expect(res.status).toBe('ok');

    const queue: any[] = [];
    let resolvedBody: any = null;
    const item = {
      method: 'get',
      path: 'userMissions',
      options: {},
      resolve: (resp: any) => {
        resolvedBody = resp.body;
      },
    };
    fakeProto.push.call(queue, item);

    await queue[0].resolve({
      body: {
        dailyUserMissions: [
          {
            mission: {
              title: 'フェスをプレイしよう',
              missionReward: { content: { name: 'キーホルダー' } },
            },
          },
        ],
      },
    });

    expect(resolvedBody.dailyUserMissions[0].mission.title).toBe('进行1次Fes');
    expect(resolvedBody.dailyUserMissions[0].mission.missionReward.content.name).toBe('钥匙链');
  });
});
