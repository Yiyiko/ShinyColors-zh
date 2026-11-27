import type { TemplateTextMatcher } from '../core/template-matcher';
import type { DataRepository } from '../data/repository';
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

export function registerDefaultApiRoutes(router: ApiRouter, repo: DataRepository): void {
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
  };

  router.register('GET', ['userMissions', 'userBeginnerMissions/top', 'idolRoads/top'], handleMissions);
  router.register('POST', ['myPage', 'userLectureMissions/{num}/actions/receive'], handleMissions);

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
}

let apiQueueHookInstalled = false;

export function installApiHook(
  ctx: HookContext,
  options: { targetArrayProto?: { push: typeof Array.prototype.push } } = {},
): HookInstallResult {
  const router = new ApiRouter();
  registerDefaultApiRoutes(router, ctx.repo);

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

  ctx.diag.setHook('api', 'ok', 'queue guard active (mission/item/skill/title)');
  return { name: 'api', status: 'ok', detail: 'queue guard active (mission/item/skill/title)' };
}
