import type { EzgCaptureResult, RequireCaptureResult } from '../boot';
import type { LocateResult, ModuleName } from '../locator';
import { APP_NAME, APP_VERSION } from '../meta';

export type HookStatus = 'ok' | 'failed' | 'notFound' | 'pending';

export interface HookDiagEntry {
  status: HookStatus;
  detail?: string;
}

export interface StoryCoverageEntry {
  path: string;
  translator: string;
  isAI: boolean;
  totalLines: number;
  matchedLines: number;
  coveragePct: number;
  updatedAt: string;
}

export interface ResourceVersionMismatch {
  name: string;
  expectedVersion: string;
  actualUrl: string;
}

export interface DiagnosticsSnapshot {
  version: string;
  enabled: boolean;
  boot: {
    require: Omit<RequireCaptureResult, 'require'> & { captured: boolean };
    ezg: Omit<EzgCaptureResult, 'ezg'> & { captured: boolean };
  };
  modules: Partial<Record<ModuleName, { id: string | null; source: string }>>;
  hooks: Record<string, HookDiagEntry>;
  data: {
    source: string;
    version: string;
    upstreamCommit: string;
  };
  lastStory: StoryCoverageEntry | null;
  resourceReplacedCount: number;
  resourceMismatches: ResourceVersionMismatch[];
  errors: Array<{ scope: string; message: string; at: string }>;
}

export class DiagnosticsStore {
  private state: DiagnosticsSnapshot;
  private listeners = new Set<() => void>();

  constructor() {
    this.state = {
      version: APP_VERSION,
      enabled: true,
      boot: {
        require: {
          captured: false,
          method: 'timeout',
          chunkVar: null,
          appBundle: null,
          elapsedMs: 0,
        },
        ezg: {
          captured: false,
          method: 'timeout',
          elapsedMs: 0,
        },
      },
      modules: {},
      hooks: {
        story: { status: 'pending' },
        phrase: { status: 'pending' },
        text: { status: 'pending' },
        api: { status: 'pending' },
        resource: { status: 'pending' },
        font: { status: 'pending' },
      },
      data: {
        source: '未加载',
        version: '-',
        upstreamCommit: '-',
      },
      lastStory: null,
      resourceReplacedCount: 0,
      resourceMismatches: [],
      errors: [],
    };
  }

  getSnapshot(): DiagnosticsSnapshot {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const fn of this.listeners) {
      try {
        fn();
      } catch {
        // Ignore subscriber errors
      }
    }
  }

  setEnabled(enabled: boolean): void {
    this.state.enabled = enabled;
    this.emit();
  }

  setRequireBoot(res: RequireCaptureResult): void {
    this.state.boot.require = {
      captured: Boolean(res.require),
      method: res.method,
      chunkVar: res.chunkVar,
      appBundle: res.appBundle,
      elapsedMs: res.elapsedMs,
    };
    this.emit();
  }

  setEzgBoot(res: EzgCaptureResult): void {
    this.state.boot.ezg = {
      captured: Boolean(res.ezg),
      method: res.method,
      elapsedMs: res.elapsedMs,
    };
    this.emit();
  }

  setModules(results: Record<ModuleName, LocateResult>): void {
    const summary: Partial<Record<ModuleName, { id: string | null; source: string }>> = {};
    for (const [name, res] of Object.entries(results) as Array<[ModuleName, LocateResult]>) {
      summary[name] = { id: res.id, source: res.source };
    }
    this.state.modules = summary;
    this.emit();
  }

  setHook(name: string, status: HookStatus, detail?: string): void {
    this.state.hooks[name] = { status, detail };
    this.emit();
  }

  setDataInfo(info: Partial<DiagnosticsSnapshot['data']>): void {
    this.state.data = { ...this.state.data, ...info };
    this.emit();
  }

  setLastStory(entry: StoryCoverageEntry): void {
    this.state.lastStory = entry;
    this.emit();
  }

  recordResourceReplaced(): void {
    this.state.resourceReplacedCount += 1;
    this.emit();
  }

  recordResourceMismatch(item: ResourceVersionMismatch): void {
    if (this.state.resourceMismatches.length >= 20) return;
    if (this.state.resourceMismatches.some((x) => x.name === item.name)) return;
    this.state.resourceMismatches.push(item);
    this.emit();
  }

  recordError(scope: string, err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    this.state.errors.push({ scope, message, at: new Date().toISOString() });
    if (this.state.errors.length > 50) {
      this.state.errors.shift();
    }
    this.emit();
  }
}

export class DiagnosticsPanel {
  private host: HTMLDivElement | null = null;
  private shadow: ShadowRoot | null = null;
  private visible = false;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly store: DiagnosticsStore,
    private readonly actions?: {
      onClearCache?: () => Promise<void> | void;
      onToggleEnabled?: () => void;
      getUntranslatedVoicesCsv?: () => { count: number; csv: string | null };
    },
  ) {}

  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show(): void {
    if (typeof document === 'undefined') return;
    if (!this.host) {
      this.mount();
    }
    this.visible = true;
    if (this.host) {
      this.host.style.display = 'block';
    }
    this.render();
  }

  hide(): void {
    this.visible = false;
    if (this.host) {
      this.host.style.display = 'none';
    }
  }

  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.host?.remove();
    this.host = null;
    this.shadow = null;
  }

  private mount(): void {
    const host = document.createElement('div');
    host.id = 'sczh-diagnostics-host';
    host.style.position = 'fixed';
    host.style.top = '16px';
    host.style.right = '16px';
    host.style.zIndex = '2147483647';
    host.style.display = 'none';
    const shadow = host.attachShadow({ mode: 'open' });
    (document.body ?? document.documentElement).appendChild(host);
    this.host = host;
    this.shadow = shadow;
    this.unsubscribe = this.store.subscribe(() => {
      if (this.visible) this.render();
    });
  }

  private render(): void {
    if (!this.shadow) return;
    const s = this.store.getSnapshot();
    const badgeColor = (status: string): string => {
      if (status === 'ok' || status === 'true') return '#22c55e';
      if (status === 'failed') return '#ef4444';
      if (status === 'notFound') return '#f59e0b';
      return '#94a3b8';
    };

    const modRows = Object.entries(s.modules)
      .map(
        ([name, info]) =>
          `<tr><td>${name}</td><td><code>${info?.id ?? '-'}</code></td><td>${info?.source ?? '-'}</td></tr>`,
      )
      .join('');

    const hookRows = Object.entries(s.hooks)
      .map(
        ([name, entry]) =>
          `<tr><td>${name}</td><td><span class="dot" style="background:${badgeColor(entry.status)}"></span>${entry.status}</td><td>${entry.detail ?? ''}</td></tr>`,
      )
      .join('');

    const storyHtml = s.lastStory
      ? `<div><code>${s.lastStory.path}</code><br/>覆盖率：<b>${s.lastStory.matchedLines}/${s.lastStory.totalLines} (${s.lastStory.coveragePct}%)</b> · 译者：${s.lastStory.translator || '未知'}${s.lastStory.isAI ? ' [AI]' : ''}</div>`
      : '<div class="muted">尚未加载剧情</div>';

    const voiceInfo = this.actions?.getUntranslatedVoicesCsv?.() ?? { count: 0, csv: null };

    this.shadow.innerHTML = `
      <style>
        .card {
          width: 420px; max-height: 82vh; overflow-y: auto;
          background: rgba(15, 23, 42, 0.94); color: #e2e8f0;
          border: 1px solid rgba(148, 163, 184, 0.35); border-radius: 10px;
          padding: 12px 14px; font: 12px/1.5 system-ui, -apple-system, sans-serif;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45); text-align: left;
        }
        .hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .title { font-weight: 700; font-size: 13px; color: #38bdf8; }
        .btns { display: flex; gap: 6px; flex-wrap: wrap; }
        button {
          background: #1e293b; color: #e2e8f0; border: 1px solid #475569;
          border-radius: 6px; padding: 3px 8px; cursor: pointer; font-size: 11px;
        }
        button:hover { background: #334155; }
        h4 { margin: 10px 0 4px; font-size: 11px; text-transform: uppercase; color: #94a3b8; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        td, th { padding: 3px 4px; border-bottom: 1px solid rgba(148, 163, 184, 0.16); }
        code { background: rgba(148, 163, 184, 0.16); padding: 1px 4px; border-radius: 4px; font-family: ui-monospace, monospace; }
        .dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 5px; }
        .muted { color: #94a3b8; }
      </style>
      <div class="card">
        <div class="hdr">
          <div class="title">${APP_NAME} v${s.version} 诊断面板</div>
          <div class="btns">
            <button id="btn-copy">复制报告</button>
            <button id="btn-voices">复制未翻语音(${voiceInfo.count})</button>
            <button id="btn-clear">清缓存</button>
            <button id="btn-close">关闭</button>
          </div>
        </div>
        <div class="muted">总开关：<b>${s.enabled ? '已启用' : '已暂停'}</b> · 主包：<code>${s.boot.require.appBundle ?? '未知'}</code></div>
        <h4>Boot 捕获</h4>
        <div>require: <b>${s.boot.require.captured ? 'OK' : 'FAIL'}</b> (${s.boot.require.method}, ${s.boot.require.elapsedMs}ms, chunk=<code>${s.boot.require.chunkVar ?? '-'}</code>)</div>
        <div>ezg: <b>${s.boot.ezg.captured ? 'OK' : 'FAIL'}</b> (${s.boot.ezg.method}, ${s.boot.ezg.elapsedMs}ms)</div>
        <h4>模块定位</h4>
        <table><tbody>${modRows || '<tr><td colspan="3" class="muted">等待定位...</td></tr>'}</tbody></table>
        <h4>Hook 状态</h4>
        <table><tbody>${hookRows}</tbody></table>
        <h4>数据层</h4>
        <div>源：<code>${s.data.source}</code> · 版本：<code>${s.data.version}</code> · 上游：<code>${s.data.upstreamCommit}</code></div>
        <h4>当前剧情覆盖率</h4>
        ${storyHtml}
        <h4>最近错误 (${s.errors.length})</h4>
        <div class="muted">${s.errors.slice(-3).map((e) => `[${e.scope}] ${e.message}`).join('<br/>') || '无'}</div>
      </div>
    `;

    this.shadow.getElementById('btn-close')?.addEventListener('click', () => this.hide());
    this.shadow.getElementById('btn-copy')?.addEventListener('click', () => {
      const text = JSON.stringify(this.store.getSnapshot(), null, 2);
      void navigator.clipboard?.writeText(text);
    });
    this.shadow.getElementById('btn-voices')?.addEventListener('click', () => {
      const latest = this.actions?.getUntranslatedVoicesCsv?.();
      if (latest?.csv) {
        void navigator.clipboard?.writeText(latest.csv);
      }
    });
    this.shadow.getElementById('btn-clear')?.addEventListener('click', () => {
      void this.actions?.onClearCache?.();
    });
  }
}
