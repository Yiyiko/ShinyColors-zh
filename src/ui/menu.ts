import { readCustomSource, writeCustomSource } from '../data/repository';
import { type StoryEditorStore, triggerTextDownload } from '../dev/story-editor';
import { APP_NAME, APP_VERSION } from '../meta';
import type { DiagnosticsPanel } from './diagnostics-panel';
import { showToast } from './toast';

export interface MenuActions {
  panel: DiagnosticsPanel;
  editor: StoryEditorStore;
  onToggleEnabled: () => boolean;
  onClearCache: () => Promise<void> | void;
}

function pickLocalCsvFile(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.style.display = 'none';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) {
        resolve(null);
        return;
      }
      resolve(await file.text());
    });
    (document.body ?? document.documentElement).appendChild(input);
    input.click();
  });
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

  GM_registerMenuCommand('导出当前剧情原文 CSV', () => {
    const exported = actions.editor.exportLastStoryCsv();
    if (!exported) {
      showToast('当前尚未加载任何剧情，无法导出 CSV', { variant: 'warn' });
      return;
    }
    triggerTextDownload(exported.filename, exported.content);
    showToast(`已导出：${exported.filename}`, { variant: 'info' });
  });

  GM_registerMenuCommand('导入本地剧情 CSV 预览', async () => {
    const text = await pickLocalCsvFile();
    if (!text) return;
    const parsed = actions.editor.setPreviewCsv(text);
    if (!parsed) {
      showToast('CSV 缺少有效 info 行，无法绑定剧情路径', { variant: 'warn' });
      return;
    }
    showToast(`已载入本地预览（${parsed.infoPath}），重新进入剧情生效`, { variant: 'info' });
  });

  GM_registerMenuCommand('导出本次未翻译剧情清单', () => {
    const bundle = actions.editor.exportUntranslatedBundle();
    const count = Object.keys(bundle).length;
    if (count === 0) {
      showToast('本次会话暂未记录到未翻译剧情', { variant: 'info' });
      return;
    }
    triggerTextDownload(
      `sczh-untranslated-${Date.now()}.json`,
      JSON.stringify(bundle, null, 2) + '\n',
      'application/json;charset=utf-8',
    );
    showToast(`已导出 ${count} 篇未翻译剧情原文包`, { variant: 'info' });
  });

  GM_registerMenuCommand('设置自定义数据源 URL', () => {
    const current = readCustomSource() ?? '';
    const next = prompt(
      '输入自定义数据源根 URL（例如 http://127.0.0.1:8787/），留空则恢复默认 GitHub Pages / jsDelivr 源：',
      current,
    );
    if (next === null) return;
    writeCustomSource(next);
    alert(
      next.trim()
        ? `自定义源已设为：${next.trim()}，请刷新页面生效。`
        : '已清除自定义源，恢复默认源，请刷新页面生效。',
    );
  });

  GM_registerMenuCommand('清空本地翻译缓存', async () => {
    await actions.onClearCache();
    showToast('本地翻译缓存已清空', { variant: 'info' });
  });
}
