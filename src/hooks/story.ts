import { isStoryPath, normalizeStoryPath } from '../core/normalize';
import { applyStoryTranslation, type StoryItem } from '../core/story-matcher';
import { STORY_TAG_MARKER } from '../core/text-matcher';
import { showToast } from '../ui/toast';
import type { HookContext, HookInstallResult } from './types';

interface ScenarioModule {
  load: (path: string, ...rest: unknown[]) => Promise<unknown>;
}

export function installStoryHook(ctx: HookContext): HookInstallResult {
  const mod = ctx.modules.SCENARIO?.value as ScenarioModule | null;
  if (!mod || typeof mod.load !== 'function') {
    ctx.diag.setHook('story', 'notFound', 'SCENARIO.load unavailable');
    return { name: 'story', status: 'notFound', detail: 'SCENARIO.load unavailable' };
  }

  const origLoad = mod.load;
  const showHints = ctx.showStoryHints ?? true;

  mod.load = async function (rawPath: string, ...rest: unknown[]) {
    const res = await origLoad.call(this, rawPath, ...rest);

    if (typeof rawPath !== 'string' || !Array.isArray(res) || !isStoryPath(rawPath)) {
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
