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
import { createDefaultMtConfig, RuntimeTranslator } from '../src/translate';
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
        'data/profile.csv': 'h_prf',
        'data/etc/support-skill.csv': 'h_ssk',
        'data/etc/ex-skill.csv': 'h_exk',
        'data/etc/idol-filter.csv': 'h_flt',
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
    'data/type-text.csv': 'text,trans\n頑張ろう！,加油！\nこんにちは\\n世界,你好\\n世界\n',
    'data/comm-story.csv': 'text,trans\nお疲れ様,辛苦了\n',
    'data/name.csv': 'name,trans\nプロデューサー,制作人\n真乃,真乃\n',
    'data/etc/idol-name.csv': 'name,trans\n櫻木真乃,樱木真乃\n風野 灯織,风野 灯织\n',
    'data/etc/mission.csv': 'text,trans,type\nフェスをプレイしよう,进行1次Fes,text\n',
    'data/etc/item.csv': 'text,trans,type\nキーホルダー,钥匙链,text\n',
    'data/skill.csv': 'text,trans,type\nVocal,Vo,noun\n$noun$percentUP,$1提升$2,\n',
    'data/title.csv': 'text,trans,type\nW.I.N.G.編,W.I.N.G.篇,text\n',
    'data/profile.csv': 'id,unit,hobby\n1,illumination STARS,散步\n',
    'data/etc/support-skill.csv': 'text,trans,type\nプロデュース開始時に絆$num,培育开始时羁绊$1,\n',
    'data/etc/ex-skill.csv': 'text,trans,type\n$noun初期値,$1初始值,\nVocal,Vo,noun\n',
    'data/etc/idol-filter.csv': 'text,trans,type\nボーカルマスタリー,Vo精通,text\n',
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

    // Prelude / local-master home voice JSONs loaded via SCENARIO.load
    const voiceScenario = {
      load: vi.fn(async (_p: string) => [
        { id: '1', comment: 'こんにちは　世界', speakerName: '灯織' },
        { id: '2', comment: 'プレリュード未翻訳ボイス' },
      ]),
    };
    installStoryHook({
      modules: makeModules({ SCENARIO: voiceScenario }),
      repo,
      diag,
      editor,
      showStoryHints: false,
    });
    const voices = (await voiceScenario.load(
      '/assets/sounds/json/prelude_mypage_voices/002/mypage_comments.json',
    )) as any[];
    expect(voices[0].comment).toBe('你好\n世界');
    expect(voices[0].speakerName).toBe('灯织');
    expect(editor.getUntranslatedVoiceCount()).toBe(1);

    // Untranslated story falls back to RuntimeTranslator while translated story never invokes MT
    const mtHttp = vi.fn(async () => ({
      status: 200,
      text: JSON.stringify(['实时机翻台词']),
    }));
    const translator = new RuntimeTranslator({
      cache: new MemoryCache(),
      http: mtHttp,
      config: createDefaultMtConfig(),
    });
    const untransScenario = {
      load: vi.fn(async (_p: string) => [{ id: '2001000000001', speaker: '真乃', text: '新しいセリフ' }]),
    };
    installStoryHook({
      modules: makeModules({ SCENARIO: untransScenario }),
      repo,
      diag,
      editor,
      translator,
      showStoryHints: false,
    });
    const mtLoaded = (await untransScenario.load('/assets/json/produce_events/999999.json')) as any[];
    expect(mtLoaded[0].text).toBe('\u200c实时机翻台词');
    expect(diag.getSnapshot().lastStory?.isAI).toBe(true);
    expect(diag.getSnapshot().lastStory?.translator).toContain('实时机翻');
    expect(mtHttp).toHaveBeenCalledTimes(1);
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

    inst._text = '灯織';
    inst.updateText();
    expect(renderedStatic[1]).toBe('灯织');

    inst.typeText('まだ翻訳されていない台詞です');
    expect(editor.getUntranslatedVoiceCount()).toBe(1);
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

  it('installs resource hook cleanly even when Resource.prototype is Object.freeze()-ed', async () => {
    const repo = createMockRepo();
    const diag = new DiagnosticsStore();
    const editor = new StoryEditorStore();
    const loadedUrls: string[] = [];

    class FrozenResource {
      name = '';
      url = '';
      crossOrigin: string | boolean = false;
      _loadElement(_type: string) {
        loadedUrls.push(this.url);
      }
    }
    Object.freeze(FrozenResource.prototype);

    class FakeLoader {
      _loadResource(resource: FrozenResource, _dequeue?: unknown) {
        resource._loadElement('image');
      }
    }

    const res = await installResourceHook({
      modules: makeModules({
        AOBA: { loaders: { Resource: FrozenResource, Loader: FakeLoader } },
      }),
      repo,
      diag,
      editor,
    });
    expect(res.status).toBe('ok');
    expect(res.detail).toContain('mode=loader-instance');

    const r = new FrozenResource();
    r.name = 'images/card/1.jpg';
    r.url = '/assets/xyz';
    new FakeLoader()._loadResource(r);
    expect(loadedUrls[0]).toBe('https://mock.local/data/picture/card/1.jpg?v=h_pic1');
    expect(r.crossOrigin).toBe('anonymous');
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

    // Also test support-skill, ex-skill, and character profile on userSupportIdols/{num}
    let sptBody: any = null;
    const sptItem = {
      method: 'get',
      path: 'userSupportIdols/123',
      options: {},
      resolve: (resp: any) => {
        sptBody = resp.body;
      },
    };
    fakeProto.push.call(queue, sptItem);
    await queue[1].resolve({
      body: {
        supportSkills: [
          { name: 'ボーカルマスタリーVo', description: 'プロデュース開始時に絆+5' },
        ],
        userSupportIdolProduceExSkills: [
          { produceExSkill: { name: 'Vocal初期値', description: 'Vocal初期値' } },
        ],
        supportIdol: {
          character: { id: '1', name: '櫻木真乃', hobby: '散歩', unit: { name: 'orig' } },
        },
      },
    });
    expect(sptBody.supportSkills[0].name).toBe('Vo精通Vo');
    expect(sptBody.supportSkills[0].description).toBe('培育开始时羁绊+5');
    expect(sptBody.userSupportIdolProduceExSkills[0].produceExSkill.name).toBe('Vo初始值');
    expect(sptBody.supportIdol.character.name).toBe('樱木真乃');
    expect(sptBody.supportIdol.character.hobby).toBe('散步');
    expect(sptBody.supportIdol.character.unit.name).toBe('illumination STARS');

    // Test myPage voice bubbles, speakerName, and producerDesk.messages
    let myPageBody: any = null;
    fakeProto.push.call(queue, {
      method: 'post',
      path: 'myPage',
      options: {},
      resolve: (resp: any) => {
        myPageBody = resp.body;
      },
    });
    await queue[2].resolve({
      body: {
        producerDesk: { messages: ['フェスをプレイしよう'] },
        userHomeDeck: {
          userHomeDeckMembers: [
            {
              character: { firstName: '灯織' },
              mypageComments: [
                { comment: 'こんにちは　世界', speakerName: '灯織' },
                { comment: '未翻訳ボイス', speakerName: '灯織' },
              ],
            },
          ],
        },
      },
    });
    expect(myPageBody.producerDesk.messages[0]).toBe('进行1次Fes');
    expect(myPageBody.userHomeDeck.userHomeDeckMembers[0].character.firstName).toBe('灯织');
    expect(myPageBody.userHomeDeck.userHomeDeckMembers[0].mypageComments[0].comment).toBe('你好\n世界');
    expect(myPageBody.userHomeDeck.userHomeDeckMembers[0].mypageComments[0].speakerName).toBe('灯织');
    expect(editor.getUntranslatedVoiceCount()).toBe(1);
  });
});
