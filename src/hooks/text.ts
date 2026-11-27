import { PixiTextMatcher } from '../core/text-matcher';
import type { HookContext, HookInstallResult } from './types';

interface EzgTextProto {
  typeText?: (text: unknown, ...rest: unknown[]) => unknown;
  updateText?: (respectDirty?: boolean) => unknown;
  _text?: string;
}

interface EzgLike {
  Text?: { prototype?: EzgTextProto };
}

export async function installTextHook(ctx: HookContext): Promise<HookInstallResult> {
  const ezg = ctx.modules.AOBA?.value as EzgLike | null;
  const proto = ezg?.Text?.prototype;
  if (!proto) {
    ctx.diag.setHook('text', 'notFound', 'ezg.Text.prototype unavailable');
    return { name: 'text', status: 'notFound', detail: 'ezg.Text.prototype unavailable' };
  }

  try {
    const [commonMap, typeTextMap] = await Promise.all([
      ctx.repo.getCommonTextMap(),
      ctx.repo.getTypeTextMap(),
    ]);
    const matcher = new PixiTextMatcher({ commonMap, typeTextMap });
    let wrappedCount = 0;

    if (typeof proto.typeText === 'function') {
      const origTypeText = proto.typeText;
      proto.typeText = function (text: unknown, ...rest: unknown[]) {
        const nextText = typeof text === 'string' ? matcher.translateTypeText(text) : text;
        return origTypeText.call(this, nextText, ...rest);
      };
      wrappedCount += 1;
    }

    if (typeof proto.updateText === 'function') {
      const origUpdateText = proto.updateText;
      proto.updateText = function (this: EzgTextProto, respectDirty?: boolean) {
        if (typeof this._text === 'string' && this._text.length > 0) {
          const translated = matcher.translateStaticText(this._text);
          if (translated !== this._text) {
            this._text = translated;
          }
        }
        return origUpdateText.call(this, respectDirty);
      };
      wrappedCount += 1;
    }

    const detail = `wrapped=${wrappedCount}, common=${commonMap.size}, typeText=${typeTextMap.size}`;
    ctx.diag.setHook('text', 'ok', detail);
    return { name: 'text', status: 'ok', detail };
  } catch (err) {
    ctx.diag.recordError('text', err);
    ctx.diag.setHook('text', 'failed', err instanceof Error ? err.message : String(err));
    return { name: 'text', status: 'failed', detail: String(err) };
  }
}
