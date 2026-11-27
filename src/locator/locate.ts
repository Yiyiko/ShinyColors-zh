import type { WebpackRequire } from '../boot/capture-require';
import {
  matchesFactoryHints,
  MODULE_SIGNATURES,
  SIGNATURE_MAP,
  type ModuleName,
  type ModuleSignature,
} from './signatures';

export type LocateSource =
  | 'ezg-boot'
  | 'session-cache'
  | 'hint'
  | 'loaded-cache'
  | 'factory-scan'
  | 'not-found';

export interface LocateResult<T = unknown> {
  name: ModuleName;
  id: string | null;
  value: T | null;
  source: LocateSource;
}

export interface LocateOptions {
  appBundle?: string | null;
  ezgFallback?: Record<string, unknown> | null;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  extraHints?: Partial<Record<ModuleName, number[]>>;
}

function getCacheKey(appBundle?: string | null): string {
  return `sczh:mod-ids:${appBundle || 'unknown'}`;
}

function readCache(
  storage: Pick<Storage, 'getItem' | 'setItem'> | null | undefined,
  appBundle?: string | null,
): Record<string, string> {
  if (!storage) return {};
  try {
    const raw = storage.getItem(getCacheKey(appBundle));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeCache(
  storage: Pick<Storage, 'getItem' | 'setItem'> | null | undefined,
  appBundle: string | null | undefined,
  map: Record<string, string>,
): void {
  if (!storage) return;
  try {
    storage.setItem(getCacheKey(appBundle), JSON.stringify(map));
  } catch {
    // Ignore quota / security errors
  }
}

function safeRequire(req: WebpackRequire, id: string | number): unknown {
  try {
    return req(id);
  } catch {
    return null;
  }
}

function tryIdWithFactoryGuard(
  req: WebpackRequire,
  id: string | number,
  sig: ModuleSignature,
): unknown | null {
  const key = String(id);
  // If already instantiated in webpack module cache, inspecting exports has zero side effects.
  const cached = req.c?.[key] ?? req.c?.[id];
  if (cached && sig.matchExports(cached.exports)) {
    return cached.exports;
  }
  const factory = req.m?.[key] ?? req.m?.[id];
  if (!factory) return null;
  if (!matchesFactoryHints(factory, sig.factoryHints)) return null;
  const loaded = safeRequire(req, id);
  return sig.matchExports(loaded) ? loaded : null;
}

export function locateModule<T = unknown>(
  req: WebpackRequire | null,
  name: ModuleName,
  options: LocateOptions = {},
): LocateResult<T> {
  const sig = SIGNATURE_MAP.get(name);
  if (!sig) {
    return { name, id: null, value: null, source: 'not-found' };
  }

  if (name === 'AOBA' && options.ezgFallback && sig.matchExports(options.ezgFallback)) {
    return {
      name,
      id: 'window.ezg',
      value: sig.extract(options.ezgFallback) as T,
      source: 'ezg-boot',
    };
  }

  if (!req) {
    return { name, id: null, value: null, source: 'not-found' };
  }

  const storage =
    options.storage !== undefined
      ? options.storage
      : typeof sessionStorage !== 'undefined'
        ? sessionStorage
        : null;

  const cache = readCache(storage, options.appBundle);

  // 1. Try cached module ID for current app bundle
  const cachedId = cache[name];
  if (cachedId) {
    const mod = tryIdWithFactoryGuard(req, cachedId, sig);
    if (mod) {
      return { name, id: cachedId, value: sig.extract(mod) as T, source: 'session-cache' };
    }
  }

  // 2. Try hint IDs (extraHints + built-in hintIds)
  const hintIds = [...(options.extraHints?.[name] ?? []), ...sig.hintIds];
  for (const id of hintIds) {
    const mod = tryIdWithFactoryGuard(req, id, sig);
    if (mod) {
      const strId = String(id);
      cache[name] = strId;
      writeCache(storage, options.appBundle, cache);
      return { name, id: strId, value: sig.extract(mod) as T, source: 'hint' };
    }
  }

  // 3. Scan already-loaded webpack cache `req.c` (zero side effects)
  if (req.c) {
    for (const id of Object.keys(req.c)) {
      const entry = req.c[id];
      if (entry && sig.matchExports(entry.exports)) {
        cache[name] = id;
        writeCache(storage, options.appBundle, cache);
        return { name, id, value: sig.extract(entry.exports) as T, source: 'loaded-cache' };
      }
    }
  }

  // 4. Full scan of `req.m` gated strictly by `factoryHints`
  if (req.m) {
    for (const id of Object.keys(req.m)) {
      const factory = req.m[id];
      if (!matchesFactoryHints(factory, sig.factoryHints)) continue;
      const loaded = safeRequire(req, id);
      if (sig.matchExports(loaded)) {
        cache[name] = id;
        writeCache(storage, options.appBundle, cache);
        return { name, id, value: sig.extract(loaded) as T, source: 'factory-scan' };
      }
    }
  }

  return { name, id: null, value: null, source: 'not-found' };
}

export function locateAllModules(
  req: WebpackRequire | null,
  options: LocateOptions = {},
): Record<ModuleName, LocateResult> {
  const results = {} as Record<ModuleName, LocateResult>;
  for (const sig of MODULE_SIGNATURES) {
    results[sig.name] = locateModule(req, sig.name, options);
  }
  return results;
}
