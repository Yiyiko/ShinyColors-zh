export type ToastVariant = 'info' | 'ai' | 'warn';

export function showToast(
  message: string,
  options: { variant?: ToastVariant; durationMs?: number } = {},
): void {
  if (typeof document === 'undefined') return;
  const hostParent = document.body ?? document.documentElement;
  if (!hostParent) return;

  const variant = options.variant ?? 'info';
  const durationMs = options.durationMs ?? 4500;
  const accent =
    variant === 'ai' ? '#a855f7' : variant === 'warn' ? '#f59e0b' : '#38bdf8';

  let container = document.getElementById('sczh-toast-host');
  let shadow: ShadowRoot;
  if (!container) {
    container = document.createElement('div');
    container.id = 'sczh-toast-host';
    container.style.cssText =
      'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:2147483647;pointer-events:none;';
    shadow = container.attachShadow({ mode: 'open' });
    hostParent.appendChild(container);
  } else {
    shadow = container.shadowRoot ?? container.attachShadow({ mode: 'open' });
  }

  shadow.innerHTML = '';
  const el = document.createElement('div');
  el.style.cssText = [
    'pointer-events:auto',
    'display:flex',
    'align-items:center',
    'gap:10px',
    'background:rgba(15,23,42,0.92)',
    'color:#f1f5f9',
    `border:1px solid ${accent}`,
    'border-radius:8px',
    'padding:7px 14px',
    'font:12px/1.4 system-ui,-apple-system,sans-serif',
    'box-shadow:0 8px 24px rgba(0,0,0,0.4)',
  ].join(';');

  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText =
    'background:none;border:none;color:#94a3b8;cursor:pointer;font-size:15px;padding:0 2px;';
  closeBtn.addEventListener('click', () => {
    el.remove();
  });

  el.append(textSpan, closeBtn);
  shadow.appendChild(el);

  if (durationMs > 0) {
    setTimeout(() => {
      el.remove();
    }, durationMs);
  }
}
