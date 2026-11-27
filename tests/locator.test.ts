import { describe, expect, it, vi } from 'vitest';
import type { WebpackModuleFactory, WebpackRequire } from '../src/boot/capture-require';
import { locateAllModules, locateModule } from '../src/locator';

function createMockWebpackRequire() {
  const sideEffectSpy = vi.fn();

  const modules: Record<number, { factory: WebpackModuleFactory; exports: unknown }> = {
    // Drifted IDs (intentionally different from default hints!)
    88001: {
      factory: function (e: any) {
        // Simulates window.ezg capture factory hint: window.ezg=null
        const t = (globalThis as any).window?.ezg;
        e.exports = t;
      },
      exports: { loaders: { Resource: {} }, Text: {}, BLEND_MODES: {} },
    },
    22001: {
      factory: function () {
        // Contains SCENARIO factory hints: _errorEvent, _handleError, decryptResource
        return '_errorEvent _handleError decryptResource';
      },
      exports: {
        A: {
          _errorEvent: null,
          load: () => Promise.resolve([]),
          _handleError: () => {},
        },
      },
    },
    33001: {
      factory: function () {
        // Contains PHRASE factory hints: _polyglot, transformPhrase
        return '_polyglot transformPhrase';
      },
      exports: {
        A: {
          _locale: 'ja',
          _polyglot: null,
          init: () => {},
          t: (k: string) => k,
        },
      },
    },
    44001: {
      factory: function () {
        // Contains WEBP factory hints
        return 'isSupportedWebP isWebPResource toWebPUrl data:image/webp';
      },
      exports: {
        A: {
          isSupportedWebP: () => true,
          toWebPUrl: (s: string) => s,
        },
      },
    },
    55001: {
      factory: function () {
        // Contains API_CLIENT factory hints
        return '_encryptRequest _addQueue x-maintenance';
      },
      exports: {
        A: Object.freeze({
          get: () => {},
          post: () => {},
          request: () => {},
          _addQueue: () => {},
        }),
      },
    },
    // Side-effectful unrelated module that must NEVER be executed during scan
    99999: {
      factory: function () {
        sideEffectSpy();
      },
      exports: { dangerous: true },
    },
  };

  const cache: Record<string, { id: string; loaded: boolean; exports: unknown }> = {};
  const m: Record<string, WebpackModuleFactory> = {};

  for (const [id, entry] of Object.entries(modules)) {
    m[id] = entry.factory;
  }

  const req = ((id: string | number) => {
    const key = String(id);
    if (cache[key]) return cache[key].exports;
    const entry = modules[Number(id)];
    if (!entry) throw new Error(`Missing module ${id}`);
    if (Number(id) === 99999) sideEffectSpy();
    cache[key] = { id: key, loaded: true, exports: entry.exports };
    return entry.exports;
  }) as WebpackRequire;

  req.m = m;
  req.c = cache;

  return { req, sideEffectSpy };
}

function createMemoryStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const store = new Map<string, string>();
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, v);
    },
  };
}

describe('P2 signature-based webpack module locator', () => {
  it('locates drifted modules safely without invoking unrelated side-effectful modules', () => {
    const { req, sideEffectSpy } = createMockWebpackRequire();
    const storage = createMemoryStorage();

    const results = locateAllModules(req, {
      appBundle: 'app-7f823508bcfb71a3b5eb.js',
      storage,
    });

    expect(results.SCENARIO.id).toBe('22001');
    expect(results.SCENARIO.source).toBe('factory-scan');
    expect(results.PHRASE.id).toBe('33001'); // Works even when _polyglot is null!
    expect(results.WEBP.id).toBe('44001');
    expect(results.API_CLIENT.id).toBe('55001');
    expect(sideEffectSpy).not.toHaveBeenCalled();

    // Second lookup on same appBundle hits session-cache
    const second = locateModule(req, 'SCENARIO', {
      appBundle: 'app-7f823508bcfb71a3b5eb.js',
      storage,
    });
    expect(second.source).toBe('session-cache');
    expect(second.id).toBe('22001');

    // Lookup after app bundle hash changes invalidates cache cleanly
    const nextBuild = locateModule(req, 'SCENARIO', {
      appBundle: 'app-newbuild9999.js',
      storage,
    });
    expect(nextBuild.source).toBe('loaded-cache');
    expect(nextBuild.id).toBe('22001');
  });

  it('prefers ezgFallback captured at document-start for AOBA', () => {
    const fakeEzg = { loaders: {}, Text: {}, BLEND_MODES: {} };
    const res = locateModule(null, 'AOBA', { ezgFallback: fakeEzg });
    expect(res.source).toBe('ezg-boot');
    expect(res.value).toBe(fakeEzg);
  });
});
