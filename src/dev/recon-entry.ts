import { installEzgCapture, installRequireCapture } from '../boot';
import { locateAllModules, type LocateResult, type ModuleName } from '../locator';
import { APP_VERSION } from '../meta';

const REPORT_ENDPOINT = 'http://127.0.0.1:8787/report';
const ATLAS_ENDPOINT = 'http://127.0.0.1:8787/ui-atlas';

interface ReconState {
  version: string;
  startedAt: string;
  url: string;
  readyStateAtBoot: string;
  boot: {
    require: Record<string, unknown> | null;
    ezg: Record<string, unknown> | null;
  };
  modules: Record<string, { id: string | null; source: string; exportKeys: Record<string, string> }>;
  scenarioCalls: Array<{ path: string; isArray: boolean; length: number; sampleKeys: string[] }>;
  phraseStats: {
    initialized: boolean;
    keyCount: number;
    sampleKeys: string[];
  };
  textSamples: {
    typeTextCount: number;
    textSetterCount: number;
    typeTextSamples: string[];
    textSetterSamples: string[];
  };
  apiCalls: Record<string, { method: string; topKeys: string[]; count: number }>;
  resourceImages: Array<{ name: string; url: string }>;
  errors: string[];
}

const state: ReconState = {
  version: `${APP_VERSION}-recon`,
  startedAt: new Date().toISOString(),
  url: typeof location !== 'undefined' ? location.href : '',
  readyStateAtBoot: typeof document !== 'undefined' ? document.readyState : 'unknown',
  boot: { require: null, ezg: null },
  modules: {},
  scenarioCalls: [],
  phraseStats: { initialized: false, keyCount: 0, sampleKeys: [] },
  textSamples: {
    typeTextCount: 0,
    textSetterCount: 0,
    typeTextSamples: [],
    textSetterSamples: [],
  },
  apiCalls: {},
  resourceImages: [],
  errors: [],
};

const sentStories = new Set<string>();
const sentApis = new Set<string>();
const seenImages = new Set<string>();
const sentAtlases = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let badgeEl: HTMLDivElement | null = null;

function describeKeys(obj: unknown): Record<string, string> {
  if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) return {};
  const out: Record<string, string> = {};
  const keys = Object.keys(obj as Record<string, unknown>).slice(0, 40);
  for (const k of keys) {
    try {
      const v = (obj as Record<string, unknown>)[k];
      out[k] = Array.isArray(v) ? `array(${v.length})` : v === null ? 'null' : typeof v;
    } catch {
      out[k] = 'unreadable';
    }
  }
  return out;
}

function postJson(endpoint: string, payload: unknown): void {
  const body = JSON.stringify(payload);
  if (typeof GM_xmlhttpRequest === 'function') {
    GM_xmlhttpRequest({
      method: 'POST',
      url: endpoint,
      headers: { 'Content-Type': 'application/json' },
      data: body,
      timeout: 15000,
    });
    return;
  }
  void fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }).catch(() => {});
}

function postReport(payload: unknown): void {
  postJson(REPORT_ENDPOINT, payload);
}

function scheduleSummaryReport(): void {
  updateBadge();
  if (flushTimer !== null) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    postReport({ kind: 'summary', ...state });
  }, 1500);
}

function updateBadge(): void {
  if (!badgeEl) return;
  const modOk = Object.values(state.modules).filter((m) => m.id !== null).length;
  const modTotal = Object.keys(state.modules).length;
  const apiCount = Object.keys(state.apiCalls).length;
  badgeEl.textContent = `RECON mods:${modOk}/${modTotal} atlas:${sentAtlases.size} story:${sentStories.size} api:${apiCount}`;
}

function mountBadge(): void {
  const attach = (): void => {
    if (badgeEl || !document.body) return;
    const host = document.createElement('div');
    host.style.cssText =
      'position:fixed;top:6px;right:6px;z-index:2147483647;font:11px/1.3 ui-monospace,monospace;';
    const shadow = host.attachShadow({ mode: 'open' });
    const box = document.createElement('div');
    box.style.cssText =
      'background:rgba(15,23,42,0.88);color:#38bdf8;border:1px solid #38bdf8;border-radius:6px;padding:4px 8px;cursor:pointer;user-select:none;';
    box.title = '点击立即发送侦察报告到 127.0.0.1:8787';
    box.addEventListener('click', () => {
      postReport({ kind: 'summary', ...state });
      box.style.borderColor = '#22c55e';
      setTimeout(() => (box.style.borderColor = '#38bdf8'), 800);
    });
    shadow.appendChild(box);
    document.body.appendChild(host);
    badgeEl = box;
    updateBadge();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach, { once: true });
  } else {
    attach();
  }
}

function installApiQueueProbe(): void {
  const originPush = Array.prototype.push;
  Array.prototype.push = function (...args: unknown[]) {
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
        const method = item.method.toUpperCase();
        const reqPath = item.path;
        item.resolve = function (res: unknown) {
          try {
            const body = (res as { body?: unknown } | null)?.body;
            const topKeys =
              body && typeof body === 'object' && !Array.isArray(body)
                ? Object.keys(body as Record<string, unknown>).slice(0, 30)
                : Array.isArray(body)
                  ? [`array(${body.length})`]
                  : [typeof body];
            const key = `${method} ${reqPath}`;
            if (!state.apiCalls[key]) {
              state.apiCalls[key] = { method, topKeys, count: 1 };
            } else {
              state.apiCalls[key].count += 1;
            }
            if (!sentApis.has(key) && sentApis.size < 25) {
              sentApis.add(key);
              postReport({ kind: 'api', path: key, method, topKeys, data: body });
            }
            scheduleSummaryReport();
          } catch (e) {
            state.errors.push(`api-probe: ${String(e)}`);
          }
          return origResolve.call(this, res);
        };
      }
    }
    return originPush.apply(this, args);
  };
}

function probeScenario(scenarioMod: Record<string, unknown>): void {
  const origLoad = scenarioMod.load;
  if (typeof origLoad !== 'function') return;
  scenarioMod.load = async function (p: string, ...rest: unknown[]) {
    const res = await (origLoad as (...a: unknown[]) => Promise<unknown>).call(this, p, ...rest);
    try {
      const isArr = Array.isArray(res);
      const firstObj = isArr && res.length > 0 && typeof res[0] === 'object' ? res[0] : null;
      const sampleKeys = firstObj ? Object.keys(firstObj as Record<string, unknown>) : [];
      if (state.scenarioCalls.length < 80) {
        state.scenarioCalls.push({
          path: String(p),
          isArray: isArr,
          length: isArr ? res.length : 0,
          sampleKeys,
        });
      }
      if (
        isArr &&
        typeof p === 'string' &&
        (p.includes('communications') || p.includes('produce_events')) &&
        !sentStories.has(p) &&
        sentStories.size < 10
      ) {
        sentStories.add(p);
        postReport({ kind: 'story', path: p, data: res });
      }
      scheduleSummaryReport();
    } catch (e) {
      state.errors.push(`scenario-probe: ${String(e)}`);
    }
    return res;
  };
}

function probePhrase(phraseMod: Record<string, unknown>): void {
  const capturePhrases = (phrasesObj: unknown): void => {
    if (!phrasesObj || typeof phrasesObj !== 'object') return;
    const keys = Object.keys(phrasesObj as Record<string, unknown>);
    state.phraseStats = {
      initialized: true,
      keyCount: keys.length,
      sampleKeys: keys.slice(0, 25),
    };
    scheduleSummaryReport();
  };

  const existing = (phraseMod._polyglot as { phrases?: unknown } | null)?.phrases;
  if (existing) {
    capturePhrases(existing);
  }
  const origInit = phraseMod.init;
  if (typeof origInit === 'function') {
    phraseMod.init = function (phrases: unknown, ...rest: unknown[]) {
      capturePhrases(phrases);
      return (origInit as (...a: unknown[]) => unknown).call(this, phrases, ...rest);
    };
  }
}

function probeEzg(ezg: Record<string, unknown>): void {
  const TextClass = ezg.Text as { prototype?: Record<string, unknown> } | undefined;
  if (TextClass?.prototype) {
    const proto = TextClass.prototype;
    const origTypeText = proto.typeText;
    if (typeof origTypeText === 'function') {
      proto.typeText = function (text: unknown, ...rest: unknown[]) {
        state.textSamples.typeTextCount += 1;
        if (typeof text === 'string' && state.textSamples.typeTextSamples.length < 30) {
          if (!state.textSamples.typeTextSamples.includes(text)) {
            state.textSamples.typeTextSamples.push(text);
          }
        }
        return (origTypeText as (...a: unknown[]) => unknown).call(this, text, ...rest);
      };
    }

    const desc = Object.getOwnPropertyDescriptor(proto, 'text');
    if (desc?.set && desc.configurable) {
      Object.defineProperty(proto, 'text', {
        configurable: true,
        enumerable: desc.enumerable,
        get: desc.get,
        set(val: unknown) {
          state.textSamples.textSetterCount += 1;
          if (
            typeof val === 'string' &&
            val.trim().length > 1 &&
            state.textSamples.textSetterSamples.length < 30 &&
            !state.textSamples.textSetterSamples.includes(val)
          ) {
            state.textSamples.textSetterSamples.push(val);
          }
          desc.set?.call(this, val);
        },
      });
    }
  }

  const loaders = ezg.loaders as {
    Resource?: { prototype?: Record<string, unknown> };
    Loader?: { prototype?: { _loadResource?: (res: any, dequeue: unknown) => unknown } };
  } | undefined;

  const extractVersion = (u: string): string => {
    const m = u.match(/[?&]v=([^&]+)/);
    return m ? m[1] : '';
  };

  const captureUiResource = (res: any): void => {
    const name = String(res?.name ?? '');
    const url = String(res?.url ?? '');
    if (!name.startsWith('images/ui/')) return;
    const isAtlasJson = name.endsWith('.json') && res?.data && typeof res.data === 'object' && res.data.frames;
    const isAtlasImg =
      name.endsWith('.json_image') &&
      res?.data &&
      typeof HTMLImageElement !== 'undefined' &&
      res.data instanceof HTMLImageElement;

    if (!isAtlasJson && !isAtlasImg) return;
    const key = `${name}@${extractVersion(url)}`;
    if (sentAtlases.has(key)) return;
    sentAtlases.add(key);

    if (isAtlasJson) {
      postJson(ATLAS_ENDPOINT, {
        kind: 'json',
        name,
        url,
        version: extractVersion(url),
        data: res.data,
      });
      updateBadge();
    } else if (isAtlasImg) {
      try {
        const img = res.data as HTMLImageElement;
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx2d = canvas.getContext('2d');
        if (ctx2d && canvas.width > 0 && canvas.height > 0) {
          ctx2d.drawImage(img, 0, 0);
          const pngDataUrl = canvas.toDataURL('image/png');
          postJson(ATLAS_ENDPOINT, {
            kind: 'image',
            name,
            url,
            version: extractVersion(url),
            pngDataUrl,
          });
          updateBadge();
        }
      } catch (err) {
        state.errors.push(`atlas-canvas(${name}): ${String(err)}`);
      }
    }
  };

  // Scan already-loaded resources on singleton ezg.loader if present
  const existingResources = (ezg.loader as { resources?: Record<string, any> } | undefined)?.resources;
  if (existingResources) {
    for (const r of Object.values(existingResources)) {
      captureUiResource(r);
    }
  }

  // Hook Loader.prototype._loadResource (safe even when Resource.prototype is Object.freeze()'d)
  const loaderProto = loaders?.Loader?.prototype;
  if (loaderProto && typeof loaderProto._loadResource === 'function') {
    const origLoadRes = loaderProto._loadResource;
    loaderProto._loadResource = function (resource: any, dequeue: unknown) {
      try {
        if (resource && typeof resource === 'object' && !resource.__sczhReconAttached) {
          resource.__sczhReconAttached = true;
          const name = String(resource.name ?? '');
          const url = String(resource.url ?? '');
          if (name.startsWith('images/') && state.resourceImages.length < 40) {
            const k = `${name}|${url}`;
            if (!seenImages.has(k)) {
              seenImages.add(k);
              state.resourceImages.push({ name, url });
            }
          }
          if (name.startsWith('images/ui/') && resource.onComplete?.add) {
            resource.onComplete.add(() => captureUiResource(resource));
          }
        }
      } catch (e) {
        state.errors.push(`loader-probe: ${String(e)}`);
      }
      return origLoadRes.call(this, resource, dequeue);
    };
  }
}

async function main(): Promise<void> {
  console.info(`[ShinyColors-zh Recon] v${state.version} starting at readyState=${state.readyStateAtBoot}`);
  mountBadge();
  installApiQueueProbe();

  const ezgHandle = installEzgCapture({ timeoutMs: 30_000 });
  const reqHandle = installRequireCapture({ timeoutMs: 30_000 });

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('立即回传 P1 侦察报告', () => {
      postReport({ kind: 'summary', ...state });
      console.info('[ShinyColors-zh Recon] Report sent:', state);
    });
  }

  // Do not wait 30s on ezgHandle once require is captured
  const reqRes = await reqHandle.promise;
  const capturedEzg = ezgHandle.getCurrent();
  ezgHandle.cleanup();

  state.boot.require = {
    captured: Boolean(reqRes.require),
    method: reqRes.method,
    chunkVar: reqRes.chunkVar,
    appBundle: reqRes.appBundle,
    elapsedMs: reqRes.elapsedMs,
  };

  const located = locateAllModules(reqRes.require, {
    appBundle: reqRes.appBundle,
    ezgFallback: capturedEzg,
  });
  const ezgObj = (capturedEzg ?? located.AOBA.value) as Record<string, unknown> | null;
  state.boot.ezg = {
    captured: Boolean(ezgObj),
    method: capturedEzg ? 'defineProperty' : ezgObj ? 'existing' : 'timeout',
    elapsedMs: reqRes.elapsedMs,
  };

  if (ezgObj) {
    probeEzg(ezgObj);
  }

  for (const [name, res] of Object.entries(located) as Array<[ModuleName, LocateResult]>) {
    state.modules[name] = {
      id: res.id,
      source: res.source,
      exportKeys: describeKeys(res.value),
    };
  }

  if (located.SCENARIO.value && typeof located.SCENARIO.value === 'object') {
    probeScenario(located.SCENARIO.value as Record<string, unknown>);
  }
  if (located.PHRASE.value && typeof located.PHRASE.value === 'object') {
    probePhrase(located.PHRASE.value as Record<string, unknown>);
  }

  scheduleSummaryReport();
}

void main();
