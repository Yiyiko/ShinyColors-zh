export type ModuleName =
  | 'AOBA'
  | 'SCENARIO'
  | 'SCENARIO_WRAPPER'
  | 'PHRASE'
  | 'WEBP'
  | 'TRACK_MANAGER'
  | 'ASSET_MAP'
  | 'API_CLIENT';

export interface ModuleSignature<T = unknown> {
  name: ModuleName;
  hintIds: readonly number[];
  /**
   * Static substring/regex hints checked against `String(require.m[id])`
   * BEFORE calling `require(id)` so side-effectful unrelated modules are never executed.
   */
  factoryHints: readonly (string | RegExp)[];
  matchExports: (mod: unknown) => boolean;
  extract: (mod: unknown) => T;
}

export function getDefaultExport(mod: unknown): Record<string, unknown> | null {
  if (!mod || (typeof mod !== 'object' && typeof mod !== 'function')) return null;
  const rec = mod as Record<string, unknown>;
  if (rec.A && typeof rec.A === 'object') return rec.A as Record<string, unknown>;
  if (rec.default && typeof rec.default === 'object') return rec.default as Record<string, unknown>;
  const keys = Object.keys(rec);
  if (keys.length === 1) {
    const single = rec[keys[0]];
    if (single && typeof single === 'object') return single as Record<string, unknown>;
  }
  return rec;
}

export function matchesFactoryHints(factory: unknown, hints: readonly (string | RegExp)[]): boolean {
  if (typeof factory !== 'function') return false;
  let src: string;
  try {
    src = Function.prototype.toString.call(factory);
  } catch {
    return false;
  }
  return hints.every((hint) => (typeof hint === 'string' ? src.includes(hint) : hint.test(src)));
}

export const MODULE_SIGNATURES: readonly ModuleSignature[] = [
  {
    name: 'AOBA',
    hintIds: [77528],
    factoryHints: ['window.ezg', 'ezg=null'],
    matchExports: (mod) => {
      const m = mod as Record<string, unknown> | null;
      return Boolean(m && typeof m === 'object' && m.loaders && m.Text && m.BLEND_MODES);
    },
    extract: (mod) => mod,
  },
  {
    name: 'SCENARIO',
    hintIds: [11254],
    factoryHints: ['_errorEvent', '_handleError', 'decryptResource'],
    matchExports: (mod) => {
      const exp = getDefaultExport(mod);
      return Boolean(
        exp &&
          typeof exp.load === 'function' &&
          typeof exp._handleError === 'function' &&
          '_errorEvent' in exp,
      );
    },
    extract: (mod) => getDefaultExport(mod),
  },
  {
    name: 'SCENARIO_WRAPPER',
    hintIds: [1935],
    factoryHints: ['SCENARIO_PATH', 'ASSET_ROOT'],
    matchExports: (mod) => {
      const exp = getDefaultExport(mod);
      return Boolean(exp && typeof exp.load === 'function' && !('_errorEvent' in exp));
    },
    extract: (mod) => getDefaultExport(mod),
  },
  {
    name: 'PHRASE',
    hintIds: [40257],
    factoryHints: ['_polyglot', 'transformPhrase'],
    matchExports: (mod) => {
      const exp = getDefaultExport(mod);
      return Boolean(
        exp &&
          typeof exp.init === 'function' &&
          typeof exp.t === 'function' &&
          '_polyglot' in exp,
      );
    },
    extract: (mod) => getDefaultExport(mod),
  },
  {
    name: 'WEBP',
    hintIds: [1025],
    factoryHints: ['isSupportedWebP', 'isWebPResource', 'toWebPUrl', 'data:image/webp'],
    matchExports: (mod) => {
      const exp = getDefaultExport(mod);
      return Boolean(
        exp &&
          typeof exp.isSupportedWebP === 'function' &&
          typeof exp.toWebPUrl === 'function',
      );
    },
    extract: (mod) => getDefaultExport(mod),
  },
  {
    name: 'TRACK_MANAGER',
    hintIds: [16375],
    factoryHints: ['TrackManager', 'ScenarioPlayer'],
    matchExports: (mod) => {
      const exp = getDefaultExport(mod);
      const rec = mod as Record<string, unknown> | null;
      return Boolean(exp?.TrackManager || rec?.TrackManager);
    },
    extract: (mod) => {
      const exp = getDefaultExport(mod);
      const rec = mod as Record<string, unknown> | null;
      return exp?.TrackManager ?? rec?.TrackManager ?? null;
    },
  },
  {
    name: 'ASSET_MAP',
    hintIds: [5431],
    factoryHints: ['asset-map.json', 'getQueryString', '_hashMap'],
    matchExports: (mod) => {
      const exp = getDefaultExport(mod);
      return Boolean(
        exp &&
          typeof exp.getQueryString === 'function' &&
          typeof exp.getUrls === 'function' &&
          '_hashMap' in exp,
      );
    },
    extract: (mod) => getDefaultExport(mod),
  },
  {
    name: 'API_CLIENT',
    hintIds: [96525],
    factoryHints: ['_encryptRequest', '_addQueue', 'x-maintenance'],
    matchExports: (mod) => {
      const exp = getDefaultExport(mod);
      return Boolean(
        exp &&
          typeof exp.get === 'function' &&
          typeof exp.post === 'function' &&
          typeof exp.request === 'function' &&
          typeof exp._addQueue === 'function',
      );
    },
    extract: (mod) => getDefaultExport(mod),
  },
];

export const SIGNATURE_MAP: ReadonlyMap<ModuleName, ModuleSignature> = new Map(
  MODULE_SIGNATURES.map((sig) => [sig.name, sig]),
);
