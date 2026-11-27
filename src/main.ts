import { installEzgCapture, installRequireCapture } from './boot';
import { DataRepository } from './data';
import { StoryEditorStore } from './dev';
import {
  installApiHook,
  installFontHook,
  installPhraseHook,
  installResourceHook,
  installStoryHook,
  installTextHook,
} from './hooks';
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

  const repo = new DataRepository();
  const diag = new DiagnosticsStore();
  const editor = new StoryEditorStore();
  diag.setEnabled(enabled);

  const panel = new DiagnosticsPanel(diag, {
    onClearCache: () => repo.clearCache(),
    onToggleEnabled: () => {
      const next = toggleEnabledFlag();
      diag.setEnabled(next);
    },
  });

  registerUserscriptMenus({
    panel,
    editor,
    onToggleEnabled: () => {
      const next = toggleEnabledFlag();
      diag.setEnabled(next);
      return next;
    },
    onClearCache: () => repo.clearCache(),
  });

  if (!enabled) {
    return;
  }

  // 1. Install document-start boot captures and preload manifest concurrently
  const ezgHandle = installEzgCapture({ timeoutMs: 30_000 });
  const reqHandle = installRequireCapture({ timeoutMs: 30_000 });
  const manifestPromise = repo
    .getManifest()
    .then((loaded) => {
      diag.setDataInfo({
        source: loaded.source,
        version: loaded.manifest.version,
        upstreamCommit: loaded.manifest.upstreamCommit.slice(0, 8),
      });
      return loaded;
    })
    .catch((err) => {
      diag.recordError('manifest', err);
      diag.setDataInfo({ source: '加载失败（降级）' });
      return null;
    });

  // Install API queue hook early before first API request is dispatched
  installApiHook({
    modules: {} as never,
    repo,
    diag,
    editor,
  });

  const [ezgRes, reqRes, loadedManifest] = await Promise.all([
    ezgHandle.promise,
    reqHandle.promise,
    manifestPromise,
  ]);

  diag.setEzgBoot(ezgRes);
  diag.setRequireBoot(reqRes);

  const modules = locateAllModules(reqRes.require, {
    appBundle: reqRes.appBundle,
    ezgFallback: ezgRes.ezg,
    extraHints: loadedManifest?.manifest.moduleHints,
  });
  diag.setModules(modules);

  const hookCtx = { modules, repo, diag, editor };

  // Install remaining feature hooks concurrently; each isolates its own errors
  installStoryHook(hookCtx);
  await Promise.allSettled([
    installPhraseHook(hookCtx),
    installTextHook(hookCtx),
    installFontHook(hookCtx),
    installResourceHook(hookCtx),
  ]);

  console.info(`[${APP_NAME}] Ready:`, diag.getSnapshot().hooks);
}

void bootstrap();
