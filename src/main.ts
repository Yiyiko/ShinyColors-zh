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
import { RuntimeTranslator } from './translate';
import {
  DiagnosticsPanel,
  DiagnosticsStore,
  registerUserscriptMenus,
  TranslateSettingsPanel,
} from './ui';

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
  const translator = new RuntimeTranslator();
  const mtPanel = new TranslateSettingsPanel(translator);
  diag.setEnabled(enabled);

  const panel = new DiagnosticsPanel(diag, {
    onClearCache: () => repo.clearCache(),
    onToggleEnabled: () => {
      const next = toggleEnabledFlag();
      diag.setEnabled(next);
    },
    onOpenMtSettings: () => mtPanel.toggle(),
    getUntranslatedVoicesCsv: () => ({
      count: editor.getUntranslatedVoiceCount(),
      csv: editor.exportUntranslatedVoicesCsv(),
    }),
  });

  registerUserscriptMenus({
    panel,
    mtPanel,
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
    translator,
  });

  // Do NOT block on ezgHandle.promise (which can wait 30s if window.ezg was cleared before defineProperty).
  // Once webpack require is captured (~1s), AOBA can be retrieved immediately from module 77528.
  const [reqRes, loadedManifest] = await Promise.all([
    reqHandle.promise,
    manifestPromise,
  ]);

  const capturedEzg = ezgHandle.getCurrent();
  ezgHandle.cleanup();
  diag.setRequireBoot(reqRes);

  const modules = locateAllModules(reqRes.require, {
    appBundle: reqRes.appBundle,
    ezgFallback: capturedEzg,
    extraHints: loadedManifest?.manifest.moduleHints,
  });
  diag.setEzgBoot({
    ezg: (capturedEzg ?? (modules.AOBA?.value as Record<string, unknown> | null)) ?? null,
    method: capturedEzg ? 'defineProperty' : modules.AOBA?.value ? 'existing' : 'timeout',
    elapsedMs: reqRes.elapsedMs,
  });
  diag.setModules(modules);

  const hookCtx = { modules, repo, diag, editor, translator };

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
