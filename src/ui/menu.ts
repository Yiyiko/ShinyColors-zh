import { APP_NAME, APP_VERSION } from '../meta';
import type { DiagnosticsPanel } from './diagnostics-panel';

export interface MenuActions {
  panel: DiagnosticsPanel;
  onToggleEnabled: () => boolean;
  onClearCache: () => Promise<void> | void;
}

export function registerUserscriptMenus(actions: MenuActions): void {
  if (typeof GM_registerMenuCommand !== 'function') return;

  GM_registerMenuCommand(`打开 ${APP_NAME} v${APP_VERSION} 诊断面板`, () => {
    actions.panel.toggle();
  });

  GM_registerMenuCommand('切换汉化总开关（刷新后生效）', () => {
    const next = actions.onToggleEnabled();
    alert(`${APP_NAME} 汉化开关已切换为：${next ? '启用' : '停用'}，刷新页面后生效。`);
  });

  GM_registerMenuCommand('清空本地翻译缓存', async () => {
    await actions.onClearCache();
    alert(`${APP_NAME} 本地缓存已清空。`);
  });
}
