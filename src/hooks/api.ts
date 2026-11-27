import { normalizeLookupText } from '../core/normalize';
import { translateSpeaker } from '../core/story-matcher';
import type { TemplateTextMatcher } from '../core/template-matcher';
import type { DataRepository } from '../data/repository';
import type { StoryEditorStore } from '../dev/story-editor';
import type { HookContext, HookInstallResult } from './types';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ApiHandler = (body: Record<string, unknown>) => Promise<void> | void;

interface RouteEntry {
  matcher: string | RegExp;
  handlers: ApiHandler[];
}

function compileRoutePattern(pattern: string): string | RegExp {
  if (!pattern.includes('{') && !pattern.includes('(') && !pattern.includes('\\?')) {
    return pattern;
  }
  const exp = pattern
    .replace(/\{num\}/g, '\\d+')
    .replace(/\{uuid\}/g, '[a-f\\d]{8}-([a-f\\d]{4}-){3}[a-f\\d]{12}');
  return new RegExp(`^${exp}$`);
}

export class ApiRouter {
  private routes: Record<HttpMethod, RouteEntry[]> = {
    GET: [],
    POST: [],
    PUT: [],
    PATCH: [],
    DELETE: [],
  };

  register(method: HttpMethod, patterns: string | readonly string[], handler: ApiHandler): void {
    const list = typeof patterns === 'string' ? [patterns] : patterns;
    for (const pat of list) {
      this.routes[method].push({
        matcher: compileRoutePattern(pat),
        handlers: [handler],
      });
    }
  }

  async dispatch(method: string, reqPath: string, body: unknown): Promise<number> {
    if (!body || typeof body !== 'object') return 0;
    const upper = method.toUpperCase() as HttpMethod;
    const entries = this.routes[upper];
    if (!entries || entries.length === 0) return 0;

    let executed = 0;
    for (const entry of entries) {
      const matched =
        typeof entry.matcher === 'string'
          ? entry.matcher === reqPath
          : entry.matcher.test(reqPath);
      if (!matched) continue;
      for (const fn of entry.handlers) {
        await fn(body as Record<string, unknown>);
        executed += 1;
      }
    }
    return executed;
  }
}

function translateRewardContent(
  content: unknown,
  missionMatcher: TemplateTextMatcher,
  itemMatcher: TemplateTextMatcher,
): void {
  if (!content || typeof content !== 'object') return;
  const obj = content as Record<string, unknown>;
  if (!missionMatcher.translateField(obj, 'name')) {
    itemMatcher.translateField(obj, 'name');
  }
  if (!missionMatcher.translateField(obj, 'comment')) {
    itemMatcher.translateLinesField(obj, 'comment');
  }
}

function translateMissionList(
  list: unknown,
  missionMatcher: TemplateTextMatcher,
  itemMatcher: TemplateTextMatcher,
): void {
  if (!Array.isArray(list)) return;
  for (const entry of list) {
    const rec = entry as Record<string, unknown> | null;
    const mission = (rec?.mission ?? rec) as Record<string, unknown> | null;
    if (!mission || typeof mission !== 'object') continue;
    missionMatcher.translateField(mission, 'title');
    missionMatcher.translateField(mission, 'comment');
    missionMatcher.translateField(mission, 'afterAchievedComment');
    missionMatcher.translateField(mission, 'beforeAchievedComment');
    const reward = (mission.missionReward ?? mission.lectureMissionReward) as
      | { content?: unknown }
      | undefined;
    translateRewardContent(reward?.content, missionMatcher, itemMatcher);
  }
}

function translateSkillObject(obj: unknown, skillMatcher: TemplateTextMatcher): void {
  if (!obj || typeof obj !== 'object') return;
  const rec = obj as Record<string, unknown>;
  skillMatcher.translateField(rec, 'name');
  skillMatcher.translateField(rec, 'comment');
  skillMatcher.translateField(rec, 'releaseConditions');
  if (Array.isArray(rec.skillEffects)) {
    for (const eff of rec.skillEffects) {
      if (eff && typeof eff === 'object') {
        skillMatcher.translateField(eff as Record<string, unknown>, 'effectName');
        skillMatcher.translateField(eff as Record<string, unknown>, 'effectDescription');
      }
    }
  }
  if (rec.linkSkill) {
    translateSkillObject(rec.linkSkill, skillMatcher);
  }
}

function translateSkillPanels(panels: unknown, skillMatcher: TemplateTextMatcher): void {
  if (!Array.isArray(panels)) return;
  for (const panel of panels) {
    if (!panel || typeof panel !== 'object') continue;
    const rec = panel as Record<string, unknown>;
    skillMatcher.translateField(rec, 'releaseConditions');
    translateSkillObject(rec.passiveSkills, skillMatcher);
    translateSkillObject(rec.skill, skillMatcher);
    translateSkillObject(rec.concertActiveSkill, skillMatcher);
    if (Array.isArray(rec.activeSkills)) {
      rec.activeSkills.forEach((s) => translateSkillObject(s, skillMatcher));
    }
  }
}

export function registerDefaultApiRoutes(
  router: ApiRouter,
  repo: DataRepository,
  editor?: StoryEditorStore,
): void {
  // 1. Missions
  const handleMissions: ApiHandler = async (data) => {
    const [missionMatcher, itemMatcher] = await Promise.all([
      repo.getTemplateMatcher('data/etc/mission.csv'),
      repo.getTemplateMatcher('data/etc/item.csv'),
    ]);
    translateMissionList(data.dailyUserMissions, missionMatcher, itemMatcher);
    translateMissionList(data.weeklyUserMissions, missionMatcher, itemMatcher);
    translateMissionList(data.normalUserMissions, missionMatcher, itemMatcher);
    translateMissionList(data.specialUserMissions, missionMatcher, itemMatcher);
    translateMissionList(data.reportUserMissions, missionMatcher, itemMatcher);
    translateMissionList(data.lectureMissions, missionMatcher, itemMatcher);
    if (Array.isArray(data.eventUserMissions)) {
      for (const grp of data.eventUserMissions) {
        translateMissionList((grp as { userMissions?: unknown })?.userMissions, missionMatcher, itemMatcher);
      }
    }
    // myPage beginnerMission, userRecommendedMission & producerDesk.messages
    const beginner = data.beginnerMission as Record<string, unknown> | undefined;
    if (beginner) {
      if (beginner.clearedLectureMission) {
        translateMissionList([beginner.clearedLectureMission], missionMatcher, itemMatcher);
      }
      if (beginner.progressLectureMission) {
        translateMissionList([beginner.progressLectureMission], missionMatcher, itemMatcher);
      }
    }
    const recMission = (data.userRecommendedMission as { mission?: unknown } | undefined)?.mission;
    if (recMission) {
      translateMissionList([recMission], missionMatcher, itemMatcher);
    }
    const desk = data.producerDesk as { messages?: unknown } | undefined;
    if (Array.isArray(desk?.messages)) {
      for (let i = 0; i < desk.messages.length; i++) {
        if (typeof desk.messages[i] === 'string') {
          desk.messages[i] = missionMatcher.translate(desk.messages[i] as string);
        }
      }
    }
    if (Array.isArray(data.progresses)) {
      for (const p of data.progresses) {
        if (p && typeof p === 'object') {
          missionMatcher.translateField(p as Record<string, unknown>, 'title');
          missionMatcher.translateField(p as Record<string, unknown>, 'comment');
        }
      }
    }
  };

  router.register('GET', ['userMissions', 'userBeginnerMissions/top', 'idolRoads/top'], handleMissions);
  router.register(
    'POST',
    ['myPage', 'userLectureMissions/{num}/actions/receive', 'producerDesk/top'],
    handleMissions,
  );

  // 2. Items & Shops
  const ITEM_SUBKEYS = [
    'produceItem',
    'recoveryItem',
    'exchangeItem',
    'lotteryTicket',
    'evolutionItem',
    'gashaTicket',
    'scoutTicket',
    'enhancementItem',
  ];

  const handleItems: ApiHandler = async (data) => {
    const itemMatcher = await repo.getTemplateMatcher('data/etc/item.csv');
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data.userProduceItems)
        ? data.userProduceItems
        : null;
    if (list) {
      for (const row of list) {
        if (!row || typeof row !== 'object') continue;
        const rec = row as Record<string, unknown>;
        for (const sub of ITEM_SUBKEYS) {
          if (rec[sub] && typeof rec[sub] === 'object') {
            itemMatcher.translateField(rec[sub] as Record<string, unknown>, 'name');
            itemMatcher.translateLinesField(rec[sub] as Record<string, unknown>, 'comment');
            break;
          }
        }
        if (rec.content && typeof rec.content === 'object') {
          itemMatcher.translateField(rec.content as Record<string, unknown>, 'name');
        }
        itemMatcher.translateField(rec, 'note');
      }
    }

    const translateShops = (shops: unknown) => {
      if (!Array.isArray(shops)) return;
      for (const s of shops) {
        const shop = ((s as Record<string, unknown>)?.userShop ?? s) as Record<string, unknown>;
        if (!Array.isArray(shop?.shopMerchandises)) continue;
        for (const m of shop.shopMerchandises) {
          if (!m || typeof m !== 'object') continue;
          const merch = m as Record<string, unknown>;
          itemMatcher.translateField(merch, 'title');
          itemMatcher.translateField(merch, 'shopTitle');
          itemMatcher.translateLinesField(merch, 'comment');
        }
      }
    };
    translateShops(data.userShops);
    translateShops(data.userEventShops);
  };

  router.register(
    'GET',
    [
      'userShops',
      'userIdolPieceShops',
      'userRecoveryItems',
      'userProduceItems',
      'userExchangeItems',
      'userLotteryTickets',
      'userEvolutionItems',
      'userGashaTickets',
      'userScoutTickets',
      'userEnhancementItems',
      'userPresents\\?limit={num}',
      'userPresentHistories\\?limit={num}',
    ],
    handleItems,
  );
  router.register('POST', ['produces/{num}/actions/ready'], handleItems);

  // 3. Skills
  const handleSkills: ApiHandler = async (data) => {
    const skillMatcher = await repo.getTemplateMatcher('data/skill.csv');
    const idol = data.idol as Record<string, unknown> | undefined;
    if (idol) {
      translateSkillPanels(idol.skillPanels, skillMatcher);
      if (Array.isArray(idol.memoryAppeals)) {
        idol.memoryAppeals.forEach((m) => translateSkillObject(m, skillMatcher));
      }
      if (Array.isArray(idol.abilities)) {
        idol.abilities.forEach((a) => translateSkillObject(a, skillMatcher));
      }
    }
    const spt = data.supportIdol as Record<string, unknown> | undefined;
    if (spt) {
      translateSkillPanels(spt.skillPanels, skillMatcher);
    }
    translateSkillPanels(data.skillPanels, skillMatcher);
    if (Array.isArray(data.activeSkills)) {
      data.activeSkills.forEach((s) => translateSkillObject(s, skillMatcher));
    }
    const fesIdol = data.userFesIdol as Record<string, unknown> | undefined;
    if (fesIdol) {
      if (Array.isArray(fesIdol.activeSkills)) {
        fesIdol.activeSkills.forEach((s) => translateSkillObject(s, skillMatcher));
      }
      translateSkillObject(fesIdol.memoryAppeal, skillMatcher);
      if (Array.isArray(fesIdol.passiveSkills)) {
        fesIdol.passiveSkills.forEach((s) => translateSkillObject(s, skillMatcher));
      }
    }
  };

  router.register(
    'GET',
    [
      'userIdols/{num}',
      'userIdols/statusMax',
      'userSupportIdols/{num}',
      'userSupportIdols/statusMax',
      'userProduce(Teaching)?Idols/{num}',
      'userProduce(Teaching)?SupportIdols/{num}',
      'userFesIdols/{num}',
      'userProduces/skillPanels',
    ],
    handleSkills,
  );

  // 4. Album & Event Titles
  const handleTitles: ApiHandler = async (data) => {
    const titleMatcher = await repo.getTemplateMatcher('data/title.csv');
    const transEvents = (events: unknown) => {
      if (!Array.isArray(events)) return;
      for (const ev of events) {
        if (!ev || typeof ev !== 'object') continue;
        const rec = ev as Record<string, unknown>;
        titleMatcher.translateField(rec, 'name');
        if (Array.isArray(rec.communications)) {
          for (const commu of rec.communications) {
            if (commu && typeof commu === 'object') {
              titleMatcher.translateField(commu as Record<string, unknown>, 'name');
              titleMatcher.translateField(commu as Record<string, unknown>, 'title');
            }
          }
        }
      }
    };
    transEvents(data.gameEvents);
    transEvents(data.specialEvents);

    for (const key of ['albumCommunicationTitles', 'communications', 'voices'] as const) {
      const list = data[key];
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        if (item && typeof item === 'object') {
          titleMatcher.translateField(item as Record<string, unknown>, 'title');
          titleMatcher.translateField(item as Record<string, unknown>, 'releasedConditionComment');
        }
      }
    }
  };

  router.register('GET', ['characterAlbums', 'album/top'], handleTitles);
  router.register('POST', ['characterAlbums/characters/{num}', 'produceMarathons/{num}/top'], handleTitles);

  // 5. Support Skills (support-skill.csv + idol-filter.csv)
  const translateSupportSkillList = (
    list: unknown,
    supportMatcher: TemplateTextMatcher,
    filterMatcher: TemplateTextMatcher,
  ) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as Record<string, unknown>;
      supportMatcher.translateField(rec, 'description');
      if (typeof rec.name === 'string') {
        const name = rec.name;
        if (name.includes('マスタリー') && !name.endsWith('マスタリー')) {
          const idx = name.lastIndexOf('マスタリー') + 'マスタリー'.length;
          const prefix = name.slice(0, idx);
          const suffix = name.slice(idx);
          rec.name = filterMatcher.translate(prefix) + suffix;
        } else {
          filterMatcher.translateField(rec, 'name');
        }
      }
    }
  };

  const handleSupportSkills: ApiHandler = async (data) => {
    const [supportMatcher, filterMatcher] = await Promise.all([
      repo.getTemplateMatcher('data/etc/support-skill.csv'),
      repo.getTemplateMatcher('data/etc/idol-filter.csv'),
    ]);
    const target = (data.userSupportIdol ?? data) as Record<string, unknown>;
    translateSupportSkillList(target.acquiredSupportSkills, supportMatcher, filterMatcher);
    translateSupportSkillList(target.supportSkills, supportMatcher, filterMatcher);
    const inner = target.supportIdol as Record<string, unknown> | undefined;
    translateSupportSkillList(inner?.supportSkills, supportMatcher, filterMatcher);

    if (Array.isArray(data.userSupportIdols)) {
      for (const s of data.userSupportIdols) {
        const si = (s as { supportIdol?: { supportSkills?: unknown } })?.supportIdol;
        translateSupportSkillList(si?.supportSkills, supportMatcher, filterMatcher);
      }
    }
    if (Array.isArray(data.userDecks)) {
      for (const deck of data.userDecks) {
        const members = (deck as { userSupportIdols?: unknown })?.userSupportIdols;
        if (!Array.isArray(members)) continue;
        for (const s of members) {
          const si = (s as { supportIdol?: { supportSkills?: unknown } })?.supportIdol;
          translateSupportSkillList(si?.supportSkills, supportMatcher, filterMatcher);
        }
      }
    }
  };

  router.register(
    'GET',
    [
      'userSupportIdols/{num}',
      'userSupportIdols/statusMax',
      'produceTeachingSupportIdols/{num}',
      'userProduce(Teaching)?SupportIdols/{num}',
      'userReserveSupportIdols/userSupportIdol/{num}',
      'produces/{num}/decks',
    ],
    handleSupportSkills,
  );
  router.register(
    'POST',
    [
      'produces/{num}/actions/ready',
      'userSupportIdols/{num}/produceExSkills/{num}/actions/set',
      'produces/actions/(resume|next)',
    ],
    handleSupportSkills,
  );
  router.register('PATCH', ['userSupportIdols/{num}', 'produces/{num}/produceItem/consume'], handleSupportSkills);

  // 6. EX Skills (etc/ex-skill.csv)
  const handleExSkills: ApiHandler = async (data) => {
    const exMatcher = await repo.getTemplateMatcher('data/etc/ex-skill.csv');
    const translateExList = (list: unknown) => {
      if (!Array.isArray(list)) return;
      for (const entry of list) {
        if (!entry || typeof entry !== 'object') continue;
        const rec = entry as Record<string, unknown>;
        const target = (rec.produceExSkill ?? rec) as Record<string, unknown>;
        exMatcher.translateField(target, 'name');
        exMatcher.translateField(target, 'description');
        const upg = (rec.produceExSkillUpgrade as { produceExSkill?: Record<string, unknown> } | undefined)
          ?.produceExSkill;
        if (upg) {
          exMatcher.translateField(upg, 'name');
          exMatcher.translateField(upg, 'description');
        }
      }
    };

    translateExList(data.userIdolProduceExSkills);
    translateExList(data.userProduceIdolProduceExSkills);
    translateExList(data.userSupportIdolProduceExSkills);
    translateExList(data.userProduceSupportIdolProduceExSkills);
    translateExList(data.produceExSkillRewards);
    translateExList(data.userProduceExSkills);
    if (Array.isArray(data)) translateExList(data);

    const fesIdol = data.userFesIdol as Record<string, unknown> | undefined;
    if (fesIdol) {
      translateExList(fesIdol.userFesIdolProduceExSkills);
      if (Array.isArray(fesIdol.userFesSupportIdols)) {
        for (const spt of fesIdol.userFesSupportIdols) {
          translateExList((spt as Record<string, unknown>)?.userFesSupportIdolProduceExSkills);
        }
      }
    }
    if (data.produceExSkill && typeof data.produceExSkill === 'object') {
      exMatcher.translateField(data.produceExSkill as Record<string, unknown>, 'name');
      exMatcher.translateField(data.produceExSkill as Record<string, unknown>, 'description');
    }
  };

  router.register(
    'GET',
    [
      'userIdols/produceExSkillTop',
      'userSupportIdols/produceExSkillTop',
      'userIdols/{num}/produceExSkillTop',
      'userSupportIdols/{num}/produceExSkillTop',
      'userIdols/{num}',
      'userSupportIdols/{num}',
      'userProduce(Teaching)?Idols/{num}',
      'userProduce(Teaching)?SupportIdols/{num}',
      'userFesIdols/{num}',
      'userProducerSkills/summaries',
    ],
    handleExSkills,
  );
  router.register(
    'POST',
    [
      'userIdols/{num}/produceExSkills/{num}/actions/set',
      'userSupportIdols/{num}/produceExSkills/{num}/actions/set',
      'produces/actions/result',
      'userProduceExSkills/actions/upgrade',
    ],
    handleExSkills,
  );

  // 7. Idol Filter & Produce Titles
  const handleFilterOptions: ApiHandler = async (data) => {
    const filterMatcher = await repo.getTemplateMatcher('data/etc/idol-filter.csv');
    for (const key of ['businesses', 'units'] as const) {
      if (Array.isArray(data[key])) {
        (data[key] as Record<string, unknown>[]).forEach((item) =>
          filterMatcher.translateField(item, 'name'),
        );
      }
    }
    if (Array.isArray(data.produces)) {
      (data.produces as Record<string, unknown>[]).forEach((item) =>
        filterMatcher.translateField(item, 'title'),
      );
    }
    if (Array.isArray(data.characters)) {
      for (const ch of data.characters as Record<string, unknown>[]) {
        filterMatcher.translateField(ch, 'name');
        filterMatcher.translateField(ch, 'firstName');
        if (ch.unit && typeof ch.unit === 'object') {
          filterMatcher.translateField(ch.unit as Record<string, unknown>, 'name');
        }
      }
    }
    for (const key of [
      'activeSkills',
      'ideas',
      'idolArrivalTypes',
      'knowHowBooks',
      'supportSkillAttributes',
      'supportSkillEffects',
    ] as const) {
      if (Array.isArray(data[key])) {
        (data[key] as Record<string, unknown>[]).forEach((item) =>
          filterMatcher.translateField(item, 'label'),
        );
      }
    }
  };
  router.register('GET', ['searchPopupContents'], handleFilterOptions);

  const handleProduceTitles: ApiHandler = async (data) => {
    const titleMatcher = await repo.getTemplateMatcher('data/title.csv');
    if (Array.isArray(data.produceEvents)) {
      for (const ev of data.produceEvents) {
        if (ev && typeof ev === 'object') {
          titleMatcher.translateField(ev as Record<string, unknown>, 'title');
        }
      }
    }
    if (Array.isArray(data.produceHintSettings)) {
      for (const h of data.produceHintSettings) {
        if (h && typeof h === 'object') {
          titleMatcher.translateField(h as Record<string, unknown>, 'title');
        }
      }
    }
    const up = (data.userProduce as { produce?: Record<string, unknown> } | undefined)?.produce;
    if (up) titleMatcher.translateField(up, 'title');
  };
  router.register('GET', ['userProduceAreas'], handleProduceTitles);
  router.register(
    'POST',
    ['myPage', 'produces/actions/(resume|next|finish|act)', 'produceTeachings/resume'],
    handleProduceTitles,
  );

  // 8. Character Profiles (profile.csv + idol-name.csv)
  const handleCharacterProfile: ApiHandler = async (data) => {
    const [profileMap, idolNameMap] = await Promise.all([
      repo.getProfileMap(),
      repo.getIdolNameMap(),
    ]);
    const applyProfile = (charObj: unknown) => {
      if (!charObj || typeof charObj !== 'object') return;
      const chara = charObj as Record<string, unknown>;
      if (typeof chara.name === 'string' && idolNameMap.has(chara.name)) {
        chara.name = idolNameMap.get(chara.name);
      }
      if (typeof chara.firstName === 'string' && idolNameMap.has(chara.firstName)) {
        chara.firstName = idolNameMap.get(chara.firstName);
      }
      const row = profileMap.get(String(chara.id ?? ''));
      if (!row) return;
      for (const [k, v] of Object.entries(row)) {
        if (k === 'id' || !v || !chara[k]) continue;
        if (k === 'unit' && typeof chara.unit === 'object' && chara.unit !== null) {
          (chara.unit as Record<string, unknown>).name = v;
        } else if (typeof chara[k] === 'string') {
          chara[k] = v;
        }
      }
    };

    if (data.id && (data.starSign || data.hobby || data.characterVoice)) {
      applyProfile(data);
    }
    applyProfile((data.idol as { character?: unknown } | undefined)?.character);
    applyProfile((data.supportIdol as { character?: unknown } | undefined)?.character);
    applyProfile(
      (data.userFesIdol as { idol?: { character?: unknown } } | undefined)?.idol?.character,
    );
  };
  router.register('GET', ['userIdols/{num}', 'userSupportIdols/{num}', 'userFesIdols/{num}'], handleCharacterProfile);
  router.register('POST', ['characterAlbums/characters/{num}'], handleCharacterProfile);

  // 9. Character Voice Bubbles & Comments (myPage / fesTop / produce / gasha / album)
  let noWrapVoiceCache: Map<string, string> | null = null;
  let mergedSpeakerMap: Map<string, string> | null = null;
  const buildSpeakerMap = (
    nameMap: ReadonlyMap<string, string>,
    idolNameMap: ReadonlyMap<string, string>,
  ): Map<string, string> => {
    const out = new Map<string, string>(nameMap);
    for (const [k, v] of idolNameMap) {
      if (!out.has(k)) out.set(k, v);
      const compactK = k.replace(/\s+/g, '');
      const compactV = v.replace(/\s+/g, '');
      if (compactK && !out.has(compactK)) out.set(compactK, compactV);
      const partsK = k.split(/\s+/);
      const partsV = v.split(/\s+/);
      if (partsK.length === 2 && partsV.length === 2) {
        if (partsK[1] && !out.has(partsK[1])) out.set(partsK[1], partsV[1]);
      }
    }
    // CoMETIK & newer idols not yet in upstream etc/idol-name.csv
    const extras: ReadonlyArray<[string, string]> = [
      ['鈴木 羽那', '铃木 羽那'],
      ['鈴木羽那', '铃木羽那'],
      ['羽那', '羽那'],
      ['郁田 はるき', '郁田 春希'],
      ['郁田はるき', '郁田春希'],
      ['はるき', '春希'],
    ];
    for (const [k, v] of extras) {
      if (!out.has(k)) out.set(k, v);
    }
    return out;
  };

  const translateVoiceField = async (
    list: unknown[],
    field = 'comment',
    translateSpeakerName = false,
  ): Promise<void> => {
    if (list.length === 0) return;
    const [typeTextMap, commStoryMap, nameMap, idolNameMap] = await Promise.all([
      repo.getTypeTextMap(),
      repo.getCommStoryMap(),
      repo.getNameMap(),
      repo.getIdolNameMap(),
    ]);

    if (!mergedSpeakerMap && (nameMap.size > 0 || idolNameMap.size > 0)) {
      mergedSpeakerMap = buildSpeakerMap(nameMap, idolNameMap);
    }

    if (!noWrapVoiceCache && (typeTextMap.size > 0 || commStoryMap.size > 0)) {
      noWrapVoiceCache = new Map<string, string>();
      for (const [k, v] of typeTextMap) {
        const compact = k.replace(/[\s\u3000]+/g, '');
        if (compact && !noWrapVoiceCache.has(compact)) noWrapVoiceCache.set(compact, v);
      }
      for (const [k, v] of commStoryMap) {
        const compact = k.replace(/[\s\u3000]+/g, '');
        if (compact && !noWrapVoiceCache.has(compact)) noWrapVoiceCache.set(compact, v);
      }
    }

    const spMap = mergedSpeakerMap ?? nameMap;
    for (const entry of list) {
      if (!entry || typeof entry !== 'object') continue;
      const rec = entry as Record<string, unknown>;
      if (typeof rec[field] === 'string' && (rec[field] as string).trim()) {
        const raw = rec[field] as string;
        const norm = normalizeLookupText(raw);
        const compact = norm.replace(/[\s\u3000]+/g, '');
        const hit =
          typeTextMap.get(norm) ??
          commStoryMap.get(norm) ??
          noWrapVoiceCache?.get(compact);
        if (hit) {
          rec[field] = hit;
        } else {
          editor?.recordUntranslatedVoice(raw);
        }
      }
      if (translateSpeakerName) {
        for (const nameKey of ['speakerName', 'firstName', 'name'] as const) {
          if (typeof rec[nameKey] === 'string' && (rec[nameKey] as string).trim()) {
            const origName = rec[nameKey] as string;
            const nextName = translateSpeaker(origName, spMap);
            if (nextName !== origName) {
              rec[nameKey] = nextName;
            }
          }
        }
      }
    }
  };

  const collectVoiceObjects = (root: unknown, out: unknown[], seen = new Set<unknown>(), depth = 0): void => {
    if (!root || typeof root !== 'object' || depth > 8 || seen.has(root)) return;
    seen.add(root);
    if (Array.isArray(root)) {
      for (const item of root) collectVoiceObjects(item, out, seen, depth + 1);
      return;
    }
    const rec = root as Record<string, unknown>;
    if (
      (typeof rec.comment === 'string' && rec.comment.trim()) ||
      (typeof rec.firstName === 'string' && rec.firstName.trim()) ||
      (typeof rec.speakerName === 'string' && rec.speakerName.trim())
    ) {
      out.push(rec);
    }
    for (const val of Object.values(rec)) {
      if (val && typeof val === 'object') {
        collectVoiceObjects(val, out, seen, depth + 1);
      }
    }
  };

  const handleMyPageVoices: ApiHandler = async (data) => {
    const list: unknown[] = [];
    if (data.userHomeDeck) {
      collectVoiceObjects(data.userHomeDeck, list);
    }
    if (data.userHomeAnimationDeck) {
      collectVoiceObjects(data.userHomeAnimationDeck, list);
    }
    if (data.userHomeUnitDeck) {
      collectVoiceObjects(data.userHomeUnitDeck, list);
    }
    await translateVoiceField(list, 'comment', true);
  };

  const handleFesTopVoices: ApiHandler = async (data) => {
    const members = (data.userFesDeck as { userFesDeckMembers?: Array<{ fesTopCharacterReactions?: unknown[] }> } | undefined)
      ?.userFesDeckMembers;
    if (!Array.isArray(members)) return;
    const list: unknown[] = [];
    for (const m of members) {
      if (Array.isArray(m?.fesTopCharacterReactions)) list.push(...m.fesTopCharacterReactions);
    }
    await translateVoiceField(list, 'comment', false);
  };

  const handleProduceVoices: ApiHandler = async (data) => {
    const list: unknown[] = [];
    const topReact = data.topCharacterReaction as Record<string, unknown> | undefined;
    if (topReact) {
      for (const k of [
        'moveReactions',
        'skillReleasedReactions',
        'touchExReactions',
        'touchReactions',
        'waitReactions',
      ]) {
        if (Array.isArray(topReact[k])) list.push(...(topReact[k] as unknown[]));
      }
    }
    for (const k of [
      'produceStaffComments',
      'produceStaffConcertComments',
      'produceStaffFailComments',
      'produceStaffSeasonComments',
      'characterTrustLevelUpComments',
    ]) {
      if (Array.isArray(data[k])) list.push(...(data[k] as unknown[]));
    }
    if (data.characterComment) {
      list.push(...(Array.isArray(data.characterComment) ? data.characterComment : [data.characterComment]));
    }
    const lr = data.lessonResult as Record<string, unknown> | undefined;
    if (lr) {
      for (const k of [
        'produceActCutinComment',
        'produceRestBoostIdolComment',
        'produceRestBoostSupportIdolComment',
        'produceRestComments',
      ]) {
        if (lr[k]) list.push(...(Array.isArray(lr[k]) ? (lr[k] as unknown[]) : [lr[k]]));
      }
    }
    await translateVoiceField(list, 'comment', true);
  };

  const handleAlbumAndGashaVoices: ApiHandler = async (data) => {
    const list: unknown[] = [];
    if (Array.isArray(data.produceIdols)) {
      for (const p of data.produceIdols as Array<{ comment?: unknown }>) {
        if (p?.comment) list.push(p.comment);
      }
    }
    if (Array.isArray(data.voices)) {
      for (const v of data.voices as Array<{ characterTrustLevelComment?: unknown }>) {
        if (v?.characterTrustLevelComment) list.push(v.characterTrustLevelComment);
      }
    }
    if (Array.isArray(data.gashaDraws)) {
      for (const g of data.gashaDraws as Array<{ comment?: unknown }>) {
        if (g?.comment) list.push(g.comment);
      }
    }
    await translateVoiceField(list, 'comment', false);
  };

  router.register('GET', ['userProduces'], handleProduceVoices);
  router.register('POST', ['myPage'], handleMyPageVoices);
  router.register('POST', ['fesTop'], handleFesTopVoices);
  router.register(
    'POST',
    [
      'produces/actions/(resume|next|endWeek|act|result)',
      'produces/({num}/audition|concert)/actions/(start|finish)',
    ],
    handleProduceVoices,
  );
  router.register(
    'POST',
    ['characterAlbums/characters/{num}', 'gashas/{num}/actions/draw'],
    handleAlbumAndGashaVoices,
  );
}

let apiQueueHookInstalled = false;

export function installApiHook(
  ctx: HookContext,
  options: { targetArrayProto?: { push: typeof Array.prototype.push } } = {},
): HookInstallResult {
  const router = new ApiRouter();
  registerDefaultApiRoutes(router, ctx.repo, ctx.editor);

  const proto = options.targetArrayProto ?? Array.prototype;
  if (proto === Array.prototype && apiQueueHookInstalled) {
    ctx.diag.setHook('api', 'ok', 'already installed');
    return { name: 'api', status: 'ok', detail: 'already installed' };
  }

  const originPush = proto.push;
  proto.push = function (this: unknown[], ...args: unknown[]) {
    if (
      args.length === 1 &&
      args[0] &&
      typeof args[0] === 'object' &&
      !Array.isArray(args[0])
    ) {
      const item = args[0] as Record<string, unknown>;
      if (
        typeof item.method === 'string' &&
        typeof item.path === 'string' &&
        typeof item.resolve === 'function' &&
        'options' in item
      ) {
        const origResolve = item.resolve as (res: unknown) => unknown;
        const method = item.method;
        const reqPath = item.path;
        item.resolve = async function (res: unknown) {
          try {
            const body = (res as { body?: unknown } | null)?.body;
            if (body) {
              await router.dispatch(method, reqPath, body);
            }
          } catch (err) {
            ctx.diag.recordError('api', err);
          }
          return origResolve.call(this, res);
        };
      }
    }
    return originPush.apply(this, args);
  };

  if (proto === Array.prototype) {
    apiQueueHookInstalled = true;
  }

  ctx.diag.setHook('api', 'ok', 'queue guard active (mission/item/skill/title/voice/profile)');
  return {
    name: 'api',
    status: 'ok',
    detail: 'queue guard active (mission/item/skill/title/voice/profile)',
  };
}
