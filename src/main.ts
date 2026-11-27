import { installEzgCapture, installRequireCapture } from './boot';
import { IndexedDbCache } from './data';
import { locateAllModules } from './locator';
import { APP_NAME, APP_VERSION } from './meta';
import { DiagnosticsPanel, DiagnosticsStore, registerUserscriptMenus } from './ui';

const ENABLED_STORAGE_KEY = 'sczh:enabled';

function readEnabledFlag(): boolean {
  try {
    return localStorage.getItem(ENABLED_STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

function toggleEnabledFlag(): boolean {
  const next = !readEnabledFlag();
  try {
    localStorage.setItem(ENABLED_STORAGE_KEY, next ? 'on' : 'off');
  } catch {
    // Ignore storage restriction
  }
  return next;
}

async function bootstrap(): Promise<void> {
  const readyState = typeof document !== 'undefined' ? document.readyState : 'unknown';
  const href = typeof location !== 'undefined' ? location.href : 'unknown';
  const enabled = readEnabledFlag();

  console.info(
    `[${APP_NAME}] v${APP_VERSION} loaded (enabled=${enabled}, readyState=${readyState}, url=${href})`,
  );

  const cache = new IndexedDbCache();
  const diag = new DiagnosticsStore();
  diag.setEnabled(enabled);

  const panel = new DiagnosticsPanel(diag, {
    onClearCache: () => cache.clear(),
    onToggleEnabled: () => {
      const next = toggleEnabledFlag();
      diag.setEnabled(next);
    },
  });

  registerUserscriptMenus({
    panel,
    onToggleEnabled: () => {
      const next = toggleEnabledFlag();
      diag.setEnabled(next);
      return next;
    },
    onClearCache: () => cache.clear(),
  });

  if (!enabled) {
    return;
  }

  // Install document-start boot captures immediately
  const ezgHandle = installEzgCapture({ timeoutMs: 30_000 });
  const reqHandle = installRequireCapture({ timeoutMs: 30_000 });

  const [ezgRes, reqRes] = await Promise.all([ezgHandle.promise, reqHandle.promise]);
  diag.setEzgBoot(ezgRes);
  diag.setRequireBoot(reqRes);

  const located = locateAllModules(reqRes.require, {
    appBundle: reqRes.appBundle,
    ezgFallback: ezgRes.ezg,
  });
  diag.setModules(located);

  console.info(`[${APP_NAME}] P2 locator summary:`, diag.getSnapshot().modules);
}

void bootstrap();
