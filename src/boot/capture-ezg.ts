export type EzgCaptureMethod = 'existing' | 'defineProperty' | 'timeout';

export interface EzgCaptureResult {
  ezg: Record<string, unknown> | null;
  method: EzgCaptureMethod;
  elapsedMs: number;
}

export interface EzgCaptureHandle {
  promise: Promise<EzgCaptureResult>;
  getCurrent(): Record<string, unknown> | null;
  cleanup(): void;
}

export interface EzgCaptureOptions {
  targetWindow?: Record<string, unknown>;
  timeoutMs?: number;
  onCaptured?: (ezg: Record<string, unknown>, method: EzgCaptureMethod) => void;
}

export function installEzgCapture(options: EzgCaptureOptions = {}): EzgCaptureHandle {
  const target: Record<string, unknown> =
    options.targetWindow ??
    ((typeof window !== 'undefined' ? window : globalThis) as unknown as Record<string, unknown>);
  const timeoutMs = options.timeoutMs ?? 30_000;
  const startedAt = Date.now();

  let captured: Record<string, unknown> | null = null;
  let storedValue: unknown = target.ezg;
  let settled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let installedDefineProperty = false;
  let originalDescriptor: PropertyDescriptor | undefined;

  const cleanup = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (installedDefineProperty) {
      installedDefineProperty = false;
      try {
        if (originalDescriptor) {
          Object.defineProperty(target, 'ezg', originalDescriptor);
        } else {
          Object.defineProperty(target, 'ezg', {
            configurable: true,
            writable: true,
            enumerable: true,
            value: storedValue,
          });
        }
      } catch {
        // Ignore if host locked property
      }
    }
  };

  let resolveFn!: (res: EzgCaptureResult) => void;
  const promise = new Promise<EzgCaptureResult>((resolve) => {
    resolveFn = resolve;
  });

  const finish = (ezg: Record<string, unknown> | null, method: EzgCaptureMethod): void => {
    if (settled) return;
    settled = true;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (ezg) {
      captured = ezg;
      options.onCaptured?.(ezg, method);
    }
    resolveFn({
      ezg,
      method,
      elapsedMs: Date.now() - startedAt,
    });
  };

  if (storedValue && typeof storedValue === 'object') {
    finish(storedValue as Record<string, unknown>, 'existing');
    return {
      promise,
      getCurrent: () => captured,
      cleanup,
    };
  }

  originalDescriptor = Object.getOwnPropertyDescriptor(target, 'ezg');
  if (!originalDescriptor || originalDescriptor.configurable) {
    try {
      Object.defineProperty(target, 'ezg', {
        configurable: true,
        enumerable: true,
        get() {
          if (originalDescriptor?.get) {
            return originalDescriptor.get.call(target);
          }
          return storedValue;
        },
        set(value: unknown) {
          storedValue = value;
          if (originalDescriptor?.set) {
            originalDescriptor.set.call(target, value);
          }
          if (value && typeof value === 'object' && !captured) {
            finish(value as Record<string, unknown>, 'defineProperty');
          }
        },
      });
      installedDefineProperty = true;
    } catch {
      // Fallback: poll until timeout
    }
  }

  timer = setTimeout(() => {
    if (!settled) {
      const latest = target.ezg;
      if (latest && typeof latest === 'object') {
        finish(latest as Record<string, unknown>, 'existing');
      } else {
        finish(null, 'timeout');
      }
    }
  }, timeoutMs);

  return {
    promise,
    getCurrent: () => captured,
    cleanup,
  };
}
