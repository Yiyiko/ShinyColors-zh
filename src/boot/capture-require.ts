export interface WebpackModuleCacheEntry {
  id: string | number;
  loaded?: boolean;
  exports: unknown;
}

export type WebpackModuleFactory = (
  module: WebpackModuleCacheEntry,
  exports: unknown,
  require: WebpackRequire,
) => void;

export interface WebpackRequire {
  (id: string | number): unknown;
  m?: Record<string | number, WebpackModuleFactory>;
  c?: Record<string | number, WebpackModuleCacheEntry>;
}

export type RequireCaptureMethod =
  | 'chunk-existing'
  | 'chunk-poll'
  | 'call-proxy'
  | 'timeout';

export interface RequireCaptureResult {
  require: WebpackRequire | null;
  method: RequireCaptureMethod;
  chunkVar: string | null;
  appBundle: string | null;
  elapsedMs: number;
}

export interface RequireCaptureHandle {
  promise: Promise<RequireCaptureResult>;
  getCurrent(): WebpackRequire | null;
  cleanup(): void;
}

export interface RequireCaptureOptions {
  globalObj?: Record<string, unknown>;
  documentObj?: Document;
  timeoutMs?: number;
  pollIntervalMs?: number;
  enableCallProxy?: boolean;
}

/**
 * Matches standard webpack 5 `__webpack_require__` minified body, e.g.:
 * function a(e){var t=i[e];if(void 0!==t)return t.exports;var n=i[e]={id:e,loaded:!1,exports:{}};return o[e].call(n.exports,n,n.exports,a),n.loaded=!0,n.exports}
 */
export const WEBPACK_REQUIRE_REGEX =
  /^function\s+\w+\((\w+)\)\{var\s+(\w+)=(\w+)\[\1\];if\(void\s+0!==\2\)return\s+\2\.exports;var\s+(\w+)=\3\[\1\]=\{id:\1,loaded:!1,exports:\{\}\};return\s+\w+\[\1\]\.call\(\4\.exports,\4,\4\.exports,\w+\),\4\.loaded=!0,\4\.exports\}$/;

export function detectAppBundle(doc?: Document): string | null {
  const targetDoc = doc ?? (typeof document !== 'undefined' ? document : undefined);
  if (!targetDoc) return null;
  const scripts = targetDoc.querySelectorAll('script[src]');
  for (const el of Array.from(scripts)) {
    const src = el.getAttribute('src') ?? '';
    const match = src.match(/\/?(app-[a-f0-9]+\.js)(?:\?|$)/i);
    if (match) return match[1];
  }
  return null;
}

export function isWebpackChunkArray(value: unknown): value is unknown[] & { push: (...args: unknown[]) => unknown } {
  if (!Array.isArray(value)) return false;
  if (!Object.prototype.hasOwnProperty.call(value, 'push')) return false;
  const ownPush = (value as { push?: unknown }).push;
  return typeof ownPush === 'function' && ownPush !== Array.prototype.push;
}

export function isWebpackRequireFn(fn: unknown): fn is WebpackRequire {
  if (typeof fn !== 'function') return false;
  try {
    const src = Function.prototype.toString.call(fn);
    return WEBPACK_REQUIRE_REGEX.test(src);
  } catch {
    return false;
  }
}

export function scanWebpackChunkVars(globalObj: Record<string, unknown>): string[] {
  const found: string[] = [];
  for (const key of Object.keys(globalObj)) {
    // Skip browser globals unlikely to be webpack chunk arrays
    if (key.startsWith('on') || key === 'frames' || key === 'window' || key === 'self') continue;
    let val: unknown;
    try {
      val = globalObj[key];
    } catch {
      continue;
    }
    if (isWebpackChunkArray(val)) {
      found.push(key);
    }
  }
  return found;
}

export function installRequireCapture(options: RequireCaptureOptions = {}): RequireCaptureHandle {
  const globalObj: Record<string, unknown> =
    options.globalObj ??
    ((typeof window !== 'undefined' ? window : globalThis) as unknown as Record<string, unknown>);
  const timeoutMs = options.timeoutMs ?? 30_000;
  const pollIntervalMs = options.pollIntervalMs ?? 50;
  const enableCallProxy = options.enableCallProxy ?? true;
  const startedAt = Date.now();

  let captured: WebpackRequire | null = null;
  let settled = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  const triedChunkVars = new Set<string>();

  const originCall = Function.prototype.call;
  let callProxyActive = false;

  const restoreCallProxy = (): void => {
    if (callProxyActive) {
      callProxyActive = false;
      Function.prototype.call = originCall;
    }
  };

  const cleanup = (): void => {
    restoreCallProxy();
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (timeoutTimer !== null) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
  };

  let resolveFn!: (res: RequireCaptureResult) => void;
  const promise = new Promise<RequireCaptureResult>((resolve) => {
    resolveFn = resolve;
  });

  const finish = (
    req: WebpackRequire | null,
    method: RequireCaptureMethod,
    chunkVar: string | null,
  ): void => {
    if (settled) return;
    settled = true;
    captured = req;
    cleanup();
    resolveFn({
      require: req,
      method,
      chunkVar: chunkVar ?? scanWebpackChunkVars(globalObj)[0] ?? null,
      appBundle: detectAppBundle(options.documentObj),
      elapsedMs: Date.now() - startedAt,
    });
  };

  const tryInjectChunks = (method: 'chunk-existing' | 'chunk-poll'): boolean => {
    const vars = scanWebpackChunkVars(globalObj);
    for (const key of vars) {
      if (triedChunkVars.has(key)) continue;
      triedChunkVars.add(key);
      const arr = globalObj[key];
      if (!isWebpackChunkArray(arr)) continue;
      try {
        const chunkId = `sczh_cap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        arr.push([
          [chunkId],
          {},
          (req: unknown) => {
            if (typeof req === 'function' && !settled) {
              finish(req as WebpackRequire, method, key);
            }
          },
        ]);
        if (settled) return true;
      } catch {
        // Ignore incompatible array-like global
      }
    }
    return settled;
  };

  // Strategy A1: check already-registered webpack chunk arrays
  if (tryInjectChunks('chunk-existing')) {
    return { promise, getCurrent: () => captured, cleanup };
  }

  // Strategy B: Function.prototype.call proxy fallback (restored immediately on match or timeout)
  if (enableCallProxy) {
    const reflectApply = Reflect.apply;
    callProxyActive = true;
    Function.prototype.call = new Proxy(originCall, {
      apply(target, thisArg, argArray) {
        if (!settled && argArray.length >= 4 && typeof argArray[3] === 'function') {
          const candidate = argArray[3];
          if (isWebpackRequireFn(candidate)) {
            finish(candidate, 'call-proxy', null);
          }
        }
        return reflectApply(target, thisArg, argArray);
      },
    });
  }

  // Strategy A2: lightweight poll for dynamically initialized chunk arrays
  pollTimer = setInterval(() => {
    if (settled) {
      cleanup();
      return;
    }
    tryInjectChunks('chunk-poll');
  }, pollIntervalMs);

  timeoutTimer = setTimeout(() => {
    if (!settled) {
      finish(null, 'timeout', null);
    }
  }, timeoutMs);

  return {
    promise,
    getCurrent: () => captured,
    cleanup,
  };
}
