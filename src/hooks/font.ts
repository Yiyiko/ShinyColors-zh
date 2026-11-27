import type { HookContext, HookInstallResult } from './types';

const FONT_STYLE_ID = 'sczh-font-style';

function addPreloadLink(href: string): void {
  if (typeof document === 'undefined' || !document.head) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = 'font';
  link.type = 'font/woff2';
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

export async function installFontHook(ctx: HookContext): Promise<HookInstallResult> {
  if (typeof document === 'undefined') {
    ctx.diag.setHook('font', 'notFound', 'DOM unavailable');
    return { name: 'font', status: 'notFound', detail: 'DOM unavailable' };
  }

  try {
    const { manifest } = await ctx.repo.getManifest();
    const heitiUrl = ctx.repo.buildAssetUrl('data/font/heiti.woff2', manifest);
    const yuantiUrl = ctx.repo.buildAssetUrl('data/font/yuanti.woff2', manifest);

    if (!heitiUrl && !yuantiUrl) {
      ctx.diag.setHook('font', 'notFound', 'font assets missing in manifest');
      return { name: 'font', status: 'notFound', detail: 'font assets missing in manifest' };
    }

    const rules: string[] = [];
    if (heitiUrl) {
      rules.push(`
@font-face {
  font-family: "UDKakugo_SmallPr6-B";
  src: url("${heitiUrl}") format("woff2"),
       url("/assets/fonts/primula-UDKakugo_SmallPr6-B.woff2");
}`);
      addPreloadLink(heitiUrl);
    }

    if (yuantiUrl) {
      rules.push(`
@font-face {
  font-family: "HummingStd-E";
  src: url("${yuantiUrl}") format("woff2"),
       url("/assets/fonts/primula-HummingStd-E.woff2");
}`);
      addPreloadLink(yuantiUrl);
    }

    const existing = document.getElementById(FONT_STYLE_ID);
    existing?.remove();

    const style = document.createElement('style');
    style.id = FONT_STYLE_ID;
    style.textContent = rules.join('\n');
    (document.head ?? document.documentElement).appendChild(style);

    const detail = [heitiUrl ? 'heiti' : '', yuantiUrl ? 'yuanti' : ''].filter(Boolean).join('+');
    ctx.diag.setHook('font', 'ok', detail);
    return { name: 'font', status: 'ok', detail };
  } catch (err) {
    ctx.diag.recordError('font', err);
    ctx.diag.setHook('font', 'failed', err instanceof Error ? err.message : String(err));
    return { name: 'font', status: 'failed', detail: String(err) };
  }
}
