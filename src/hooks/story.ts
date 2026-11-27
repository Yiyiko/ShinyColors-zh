import { isStoryPath, normalizeLookupText, normalizeStoryPath } from '../core/normalize';
import { applyStoryTranslation, translateSpeaker, type StoryItem } from '../core/story-matcher';
import { STORY_TAG_MARKER } from '../core/text-matcher';
import { showToast } from '../ui/toast';
import type { HookContext, HookInstallResult } from './types';

interface ScenarioModule {
  load: (path: string, ...rest: unknown[]) => Promise<unknown>;
}

function isMypageVoiceJsonPath(rawPath: string): boolean {
  return /(?:^|\/)(?:mypage_comments|mypage_conversations)\.json(?:\?|$)/i.test(rawPath);
}

function collectCommentNodes(root: unknown, out: Record<string, unknown>[], seen = new Set<unknown>(), depth = 0): void {
  if (!root || typeof root !== 'object' || depth > 6 || seen.has(root)) return;
  seen.add(root);
  if (Array.isArray(root)) {
    for (const item of root) collectCommentNodes(item, out, seen, depth + 1);
    return;
  }
  const rec = root as Record<string, unknown>;
  if (typeof rec.comment === 'string' && rec.comment.trim()) {
    out.push(rec);
  }
  for (const val of Object.values(rec)) {
    if (val && typeof val === 'object') {
      collectCommentNodes(val, out, seen, depth + 1);
    }
  }
}

export function installStoryHook(ctx: HookContext): HookInstallResult {
  const mod = ctx.modules.SCENARIO?.value as ScenarioModule | null;
  if (!mod || typeof mod.load !== 'function') {
    ctx.diag.setHook('story', 'notFound', 'SCENARIO.load unavailable');
    return { name: 'story', status: 'notFound', detail: 'SCENARIO.load unavailable' };
  }

  const origLoad = mod.load;
  const showHints = ctx.showStoryHints ?? true;
  let compactVoiceMap: Map<string, string> | null = null;

  mod.load = async function (rawPath: string, ...rest: unknown[]) {
    const res = await origLoad.call(this, rawPath, ...rest);

    if (typeof rawPath !== 'string' || !Array.isArray(res)) {
      return res;
    }

    // Intercept prelude/local-master home screen voice JSONs loaded via SCENARIO.load
    if (isMypageVoiceJsonPath(rawPath)) {
      try {
        const [typeTextMap, commMap, nameMap, idolNameMap] = await Promise.all([
          ctx.repo.getTypeTextMap(),
          ctx.repo.getCommStoryMap(),
          ctx.repo.getNameMap(),
          ctx.repo.getIdolNameMap(),
        ]);
        if (!compactVoiceMap && (typeTextMap.size > 0 || commMap.size > 0)) {
          compactVoiceMap = new Map<string, string>();
          for (const [k, v] of typeTextMap) {
            const c = k.replace(/[\s\u3000]+/g, '');
            if (c && !compactVoiceMap.has(c)) compactVoiceMap.set(c, v);
          }
          for (const [k, v] of commMap) {
            const c = k.replace(/[\s\u3000]+/g, '');
            if (c && !compactVoiceMap.has(c)) compactVoiceMap.set(c, v);
          }
        }
        const spMap = new Map<string, string>(nameMap);
        for (const [k, v] of idolNameMap) {
          const pk = k.split(/\s+/);
          const pv = v.split(/\s+/);
          if (pk.length === 2 && pv.length === 2 && pk[1] && !spMap.has(pk[1])) {
            spMap.set(pk[1], pv[1]);
          }
        }

        const nodes: Record<string, unknown>[] = [];
        collectCommentNodes(res, nodes);
        for (const rec of nodes) {
          const raw = rec.comment as string;
          const norm = normalizeLookupText(raw);
          const compact = norm.replace(/[\s\u3000]+/g, '');
          const hit = typeTextMap.get(norm) ?? commMap.get(norm) ?? compactVoiceMap?.get(compact);
          if (hit) {
            rec.comment = hit;
          } else {
            ctx.editor.recordUntranslatedVoice(raw);
          }
          if (typeof rec.speakerName === 'string' && rec.speakerName.trim()) {
            rec.speakerName = translateSpeaker(rec.speakerName, spMap);
          }
        }
      } catch (err) {
        ctx.diag.recordError('story:voice', err);
      }
      return res;
    }

    if (!isStoryPath(rawPath)) {
      return res;
    }

    const logicalPath = normalizeStoryPath(rawPath);
    try {
      const items = res as StoryItem[];
      const preview = ctx.editor.getPreview(logicalPath);
      const [story, commMap, nameMap] = await Promise.all([
        preview ? Promise.resolve(preview) : ctx.repo.getStory(logicalPath),
        ctx.repo.getCommStoryMap(),
        ctx.repo.getNameMap(),
      ]);

      ctx.editor.recordLoadedStory(logicalPath, items, Boolean(story));

      const stats = applyStoryTranslation(items, {
        story,
        commMap,
        nameMap,
        tagMarker: STORY_TAG_MARKER,
      });

      ctx.diag.setLastStory({
        path: logicalPath,
        translator: story ? story.translator || (preview ? '本地预览' : '社区译者') : '暂无译文',
        isAI: Boolean(story?.isAI),
        totalLines: stats.totalLines + stats.totalSelects,
        matchedLines: stats.matchedLines + stats.matchedSelects,
        coveragePct: stats.coveragePct,
        updatedAt: new Date().toISOString(),
      });

      if (showHints) {
        if (preview) {
          showToast(`正在预览本地剧情译文：${logicalPath}`, { variant: 'info', durationMs: 3000 });
        } else if (story?.isAI) {
          showToast(`本段剧情由 ${story.translator} 提供机翻`, { variant: 'ai', durationMs: 4500 });
        } else if (!story) {
          showToast(`该剧情暂无中文译文（可通过菜单导出 CSV）`, {
            variant: 'warn',
            durationMs: 3500,
          });
        }
      }
    } catch (err) {
      ctx.diag.recordError('story', err);
    }

    return res;
  };

  ctx.diag.setHook('story', 'ok', `SCENARIO#${ctx.modules.SCENARIO.id}`);
  return { name: 'story', status: 'ok', detail: `SCENARIO#${ctx.modules.SCENARIO.id}` };
}
