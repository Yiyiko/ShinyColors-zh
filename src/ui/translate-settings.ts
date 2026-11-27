import { APP_NAME } from '../meta';
import {
  getMtPreset,
  MT_PRESETS,
  type MtConfig,
  type MtProviderId,
  type RuntimeTranslator,
} from '../translate';
import { showToast } from './toast';

function escapeAttr(val: string): string {
  return val
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export class TranslateSettingsPanel {
  private host: HTMLDivElement | null = null;
  private shadow: ShadowRoot | null = null;
  private visible = false;

  constructor(private readonly translator: RuntimeTranslator) {}

  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  show(): void {
    if (typeof document === 'undefined') return;
    if (!this.host) this.mount();
    this.visible = true;
    if (this.host) this.host.style.display = 'block';
    this.render();
  }

  hide(): void {
    this.visible = false;
    if (this.host) this.host.style.display = 'none';
  }

  destroy(): void {
    this.host?.remove();
    this.host = null;
    this.shadow = null;
  }

  private mount(): void {
    const host = document.createElement('div');
    host.id = 'sczh-mt-settings-host';
    host.style.position = 'fixed';
    host.style.top = '20px';
    host.style.left = '50%';
    host.style.transform = 'translateX(-50%)';
    host.style.zIndex = '2147483647';
    host.style.display = 'none';
    const shadow = host.attachShadow({ mode: 'open' });
    (document.body ?? document.documentElement).appendChild(host);
    this.host = host;
    this.shadow = shadow;
  }

  private render(): void {
    if (!this.shadow) return;
    const cfg = this.translator.getConfig();
    const currentPreset = getMtPreset(cfg.provider);

    const presetOptions = MT_PRESETS.map(
      (p) =>
        `<option value="${p.id}" ${p.id === cfg.provider ? 'selected' : ''}>${escapeAttr(p.label)}</option>`,
    ).join('');

    this.shadow.innerHTML = `
      <style>
        .card {
          width: 460px; max-width: 92vw; max-height: 86vh; overflow-y: auto;
          background: rgba(15, 23, 42, 0.96); color: #e2e8f0;
          border: 1px solid rgba(56, 189, 248, 0.45); border-radius: 12px;
          padding: 14px 16px; font: 12px/1.5 system-ui, -apple-system, sans-serif;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55); text-align: left;
        }
        .hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .title { font-weight: 700; font-size: 14px; color: #38bdf8; }
        .note { background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.28); border-radius: 8px; padding: 8px 10px; font-size: 11px; color: #bae6fd; margin-bottom: 10px; }
        .row { margin-bottom: 9px; }
        .row label { display: block; font-size: 11px; color: #94a3b8; margin-bottom: 3px; }
        .checks { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px; }
        .chk { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #f1f5f9; cursor: pointer; }
        input[type="text"], input[type="password"], input[type="number"], select, textarea {
          width: 100%; box-sizing: border-box; background: #0f172a; color: #f8fafc;
          border: 1px solid #334155; border-radius: 6px; padding: 6px 8px;
          font: 12px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace;
        }
        textarea { min-height: 52px; resize: vertical; font-family: system-ui, sans-serif; }
        .hint { font-size: 11px; color: #94a3b8; margin-top: 4px; }
        .key-wrap { display: flex; gap: 6px; }
        .key-wrap input { flex: 1; }
        .btns { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        button {
          background: #1e293b; color: #e2e8f0; border: 1px solid #475569;
          border-radius: 6px; padding: 6px 11px; cursor: pointer; font-size: 12px;
        }
        button:hover { background: #334155; }
        button.primary { background: #0284c7; border-color: #0ea5e9; color: #fff; font-weight: 600; }
        button.primary:hover { background: #0369a1; }
        .status { margin-top: 10px; padding: 8px 10px; border-radius: 6px; font-size: 11px; display: none; word-break: break-all; }
        .status.ok { display: block; background: rgba(34, 197, 94, 0.14); border: 1px solid rgba(34, 197, 94, 0.4); color: #bbf7d0; }
        .status.err { display: block; background: rgba(239, 68, 68, 0.14); border: 1px solid rgba(239, 68, 68, 0.4); color: #fecaca; }
        .status.info { display: block; background: rgba(148, 163, 184, 0.14); border: 1px solid rgba(148, 163, 184, 0.35); color: #e2e8f0; }
      </style>
      <div class="card">
        <div class="hdr">
          <div class="title">${APP_NAME} · 实时机翻设置</div>
          <button id="mt-close">关闭</button>
        </div>
        <div class="note">
          严格优先级：<b>社区人工 &gt; 本地人工 &gt; 离线 AI &gt; 实时机翻</b>。所有 API Key 仅保存在本机浏览器 localStorage，绝不上传；机翻结果自动缓存于 IndexedDB，重看零延迟。
        </div>
        <div class="checks">
          <label class="chk"><input type="checkbox" id="mt-enabled" ${cfg.enabled ? 'checked' : ''} /> 启用实时机翻</label>
          <label class="chk"><input type="checkbox" id="mt-fallback" ${cfg.fallbackToFree ? 'checked' : ''} /> 失败/无Key时自动免费保底</label>
          <label class="chk"><input type="checkbox" id="mt-stories" ${cfg.translateStories ? 'checked' : ''} /> 未翻译剧情自动机翻</label>
          <label class="chk"><input type="checkbox" id="mt-voices" ${cfg.translateVoices ? 'checked' : ''} /> 未翻译语音气泡自动机翻</label>
        </div>
        <div class="row">
          <label for="mt-provider">翻译引擎预设</label>
          <select id="mt-provider">${presetOptions}</select>
          <div class="hint" id="mt-hint">${escapeAttr(currentPreset.hint)}</div>
        </div>
        <div class="row">
          <label for="mt-url">API 接口地址（Endpoint）</label>
          <input type="text" id="mt-url" value="${escapeAttr(cfg.baseUrl)}" />
        </div>
        <div class="row">
          <label for="mt-model">模型名称（Model）</label>
          <input type="text" id="mt-model" value="${escapeAttr(cfg.model)}" />
        </div>
        <div class="row">
          <label for="mt-key">API Key / Token（免费保底与本地 Ollama 可留空）</label>
          <div class="key-wrap">
            <input type="password" id="mt-key" value="${escapeAttr(cfg.apiKey)}" placeholder="sk-... / AIza... / Token" />
            <button type="button" id="mt-toggle-key">显示</button>
          </div>
        </div>
        <div class="row">
          <label for="mt-prompt">自定义系统提示词（留空则使用内置 283 事务所术语提示词）</label>
          <textarea id="mt-prompt" placeholder="留空即可获得内置 283 角色译名与口癖提示词">${escapeAttr(cfg.customPrompt)}</textarea>
        </div>
        <div class="btns">
          <button class="primary" id="mt-save">保存设置</button>
          <button id="mt-test">测试连接</button>
          <button id="mt-clear-cache">清空机翻缓存</button>
        </div>
        <div class="status" id="mt-status"></div>
      </div>
    `;

    const q = <T extends HTMLElement>(id: string): T => this.shadow!.getElementById(id) as T;
    const providerEl = q<HTMLSelectElement>('mt-provider');
    const urlEl = q<HTMLInputElement>('mt-url');
    const modelEl = q<HTMLInputElement>('mt-model');
    const keyEl = q<HTMLInputElement>('mt-key');
    const hintEl = q<HTMLDivElement>('mt-hint');
    const promptEl = q<HTMLTextAreaElement>('mt-prompt');
    const statusEl = q<HTMLDivElement>('mt-status');

    const readForm = (): MtConfig => ({
      enabled: q<HTMLInputElement>('mt-enabled').checked,
      fallbackToFree: q<HTMLInputElement>('mt-fallback').checked,
      translateStories: q<HTMLInputElement>('mt-stories').checked,
      translateVoices: q<HTMLInputElement>('mt-voices').checked,
      provider: providerEl.value as MtProviderId,
      baseUrl: urlEl.value.trim() || getMtPreset(providerEl.value as MtProviderId).defaultBaseUrl,
      model: modelEl.value.trim() || getMtPreset(providerEl.value as MtProviderId).defaultModel,
      apiKey: keyEl.value.trim(),
      timeoutMs: cfg.timeoutMs,
      customPrompt: promptEl.value,
    });

    const setStatus = (cls: 'ok' | 'err' | 'info', msg: string) => {
      statusEl.className = `status ${cls}`;
      statusEl.textContent = msg;
    };

    providerEl.addEventListener('change', () => {
      const preset = getMtPreset(providerEl.value as MtProviderId);
      urlEl.value = preset.defaultBaseUrl;
      modelEl.value = preset.defaultModel;
      hintEl.textContent = preset.hint;
    });

    q<HTMLButtonElement>('mt-toggle-key').addEventListener('click', (ev) => {
      const btn = ev.currentTarget as HTMLButtonElement;
      if (keyEl.type === 'password') {
        keyEl.type = 'text';
        btn.textContent = '隐藏';
      } else {
        keyEl.type = 'password';
        btn.textContent = '显示';
      }
    });

    q<HTMLButtonElement>('mt-close').addEventListener('click', () => this.hide());

    q<HTMLButtonElement>('mt-save').addEventListener('click', () => {
      const next = readForm();
      this.translator.updateConfig(next);
      setStatus('ok', `已保存：${getMtPreset(next.provider).label}（无需刷新，立即对后续剧情/语音生效）`);
      showToast('实时机翻设置已保存', { variant: 'info' });
    });

    q<HTMLButtonElement>('mt-test').addEventListener('click', async () => {
      const next = readForm();
      this.translator.updateConfig(next);
      setStatus('info', '正在发送测试台词，请稍候...');
      const res = await this.translator.testConnection();
      if (res.ok) {
        const tag = res.usedFallback ? '（已自动降级至免费保底）' : '';
        setStatus(
          'ok',
          `连接成功 [${res.engineLabel}]${tag} · ${res.elapsedMs}ms\n示例译文：${res.sampleOutput}`,
        );
      } else {
        setStatus('err', `测试失败 (${res.elapsedMs}ms)：${res.error}`);
      }
    });

    q<HTMLButtonElement>('mt-clear-cache').addEventListener('click', async () => {
      await this.translator.clearCache();
      setStatus('ok', '已清空所有本地机翻缓存，重新进入剧情将重新翻译。');
      showToast('机翻缓存已清空', { variant: 'info' });
    });
  }
}
