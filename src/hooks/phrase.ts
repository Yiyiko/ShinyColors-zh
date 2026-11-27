import type { HookContext, HookInstallResult } from './types';

interface PhraseModule {
  _polyglot?: { phrases?: Record<string, string> } | null;
  init?: (phrases: Record<string, string>, locale?: string | null) => unknown;
}

function mergePhrasesInto(
  target: Record<string, string>,
  phraseMap: ReadonlyMap<string, string>,
): number {
  let count = 0;
  for (const [key, val] of phraseMap) {
    target[key] = val;
    count += 1;
  }
  return count;
}

export async function installPhraseHook(ctx: HookContext): Promise<HookInstallResult> {
  const mod = ctx.modules.PHRASE?.value as PhraseModule | null;
  if (!mod || (typeof mod.init !== 'function' && !mod._polyglot)) {
    ctx.diag.setHook('phrase', 'notFound', 'PHRASE module unavailable');
    return { name: 'phrase', status: 'notFound', detail: 'PHRASE module unavailable' };
  }

  try {
    const phraseMap = await ctx.repo.getPhraseMap();
    if (phraseMap.size === 0) {
      ctx.diag.setHook('phrase', 'ok', '0 entries (empty dictionary)');
      return { name: 'phrase', status: 'ok', detail: '0 entries (empty dictionary)' };
    }

    let applied = 0;
    if (mod._polyglot?.phrases) {
      applied = mergePhrasesInto(mod._polyglot.phrases, phraseMap);
    }

    if (typeof mod.init === 'function') {
      const origInit = mod.init;
      mod.init = function (phrases: Record<string, string>, ...rest: unknown[]) {
        if (phrases && typeof phrases === 'object') {
          const merged = { ...phrases };
          const count = mergePhrasesInto(merged, phraseMap);
          ctx.diag.setHook('phrase', 'ok', `${count} entries injected on init`);
          return origInit.call(this, merged, ...(rest as [string | null | undefined]));
        }
        return origInit.call(this, phrases, ...(rest as [string | null | undefined]));
      };
    }

    const detail =
      applied > 0
        ? `${applied} entries applied`
        : `armed (${phraseMap.size} entries waiting for init)`;
    ctx.diag.setHook('phrase', 'ok', detail);
    return { name: 'phrase', status: 'ok', detail };
  } catch (err) {
    ctx.diag.recordError('phrase', err);
    ctx.diag.setHook('phrase', 'failed', err instanceof Error ? err.message : String(err));
    return { name: 'phrase', status: 'failed', detail: String(err) };
  }
}
