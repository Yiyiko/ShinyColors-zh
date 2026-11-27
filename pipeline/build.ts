import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ManifestData, StoryIndexTuple } from '../src/data/manifest';
import { MODULE_SIGNATURES, type ModuleName } from '../src/locator/signatures';
import { REPO_NAME, REPO_OWNER } from '../src/meta';
import { mergeCsvRowsByPriority, mergeStoryLayers, mergeTypeTextLayers } from './merge';
import type { UpstreamMeta } from './sync-upstream';
import { copyTree, readTextUtf8, sha256File, sha256Hex, toPosixPath, walkFiles, writeTextUtf8 } from './utils';

const TOP_LEVEL_CSVS: ReadonlyArray<{ file: string; keyCol: string; valCol: string }> = [
  { file: 'phrase.csv', keyCol: 'id', valCol: 'trans' },
  { file: 'common.csv', keyCol: 'text', valCol: 'trans' },
  { file: 'comm-story.csv', keyCol: 'text', valCol: 'trans' },
  { file: 'name.csv', keyCol: 'name', valCol: 'trans' },
  { file: 'profile.csv', keyCol: 'id', valCol: '' },
  { file: 'skill.csv', keyCol: 'text', valCol: 'trans' },
  { file: 'title.csv', keyCol: 'text', valCol: 'trans' },
];

export interface BuildDistOptions {
  rootDir: string;
  distDir?: string;
  version?: string;
}

export interface BuildDistReport {
  version: string;
  generatedAt: string;
  upstreamCommit: string;
  stats: {
    stories: number;
    upstreamStories: number;
    localStories: number;
    aiStories: number;
    supersededAiCount: number;
    skippedNoInfoCount: number;
    pictures: number;
    indexedFiles: number;
  };
  supersededAi: Array<{ infoPath: string; aiFile: string; winnerTier: string; winnerFile: string }>;
}

function readPackageVersion(rootDir: string): string {
  const pkgPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return '0.0.0';
  const pkg = JSON.parse(readTextUtf8(pkgPath)) as { version?: string };
  return pkg.version ?? '0.0.0';
}

function readUpstreamMeta(upstreamDir: string): UpstreamMeta | null {
  const metaPath = path.join(upstreamDir, '.upstream-meta.json');
  if (!fs.existsSync(metaPath)) return null;
  try {
    return JSON.parse(readTextUtf8(metaPath)) as UpstreamMeta;
  } catch {
    return null;
  }
}

function getDefaultModuleHints(): Partial<Record<ModuleName, number[]>> {
  const hints: Partial<Record<ModuleName, number[]>> = {};
  for (const sig of MODULE_SIGNATURES) {
    hints[sig.name] = [...sig.hintIds];
  }
  return hints;
}

function renderInstallPage(manifest: ManifestData, report: BuildDistReport): string {
  const pagesUrl = `https://${REPO_OWNER}.github.io/${REPO_NAME}`;
  const repoUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ShinyColors-zh 偶像大师闪耀色彩汉化</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; color: #0f172a; line-height: 1.6; }
    .btn { display: inline-block; background: #0284c7; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; margin-right: 10px; }
    .btn:hover { background: #0369a1; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin: 20px 0; }
    code { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>ShinyColors-zh 汉化发布页</h1>
  <p>适用于桌面版 <strong>Firefox + Violentmonkey</strong> 的《偶像大师 闪耀色彩》网页版汉化脚本与自动更新翻译数据源。</p>
  <p>
    <a class="btn" href="./ShinyColors-zh.user.js">安装 / 更新油猴脚本</a>
    <a href="${repoUrl}">GitHub 仓库</a>
  </p>
  <div class="card">
    <h3>当前数据状态</h3>
    <ul>
      <li>版本：<code>${manifest.version}</code></li>
      <li>构建时间：<code>${manifest.generatedAt}</code></li>
      <li>上游译文提交：<code>${manifest.upstreamCommit}</code></li>
      <li>已收录剧情：<strong>${report.stats.stories}</strong> 篇（社区人工 ${report.stats.upstreamStories} / 本地人工 ${report.stats.localStories} / AI 补译 ${report.stats.aiStories}）</li>
      <li>数据索引：<a href="./manifest.json">manifest.json</a> · <a href="./story-index.json">story-index.json</a> · <a href="./build-report.json">build-report.json</a></li>
    </ul>
  </div>
  <p><small>数据来源与致谢：<a href="https://github.com/ShinyGroup/SCTranslationData">ShinyGroup/SCTranslationData</a> 全体译者及 <a href="https://github.com/biuuu/ShinyColors">biuuu/ShinyColors</a>。录剧情视频发布至公开网站请先取得对应译者同意。</small></p>
  <p><small>Pages 源：<code>${pagesUrl}/</code></small></p>
</body>
</html>
`;
}

export function buildDataDist(options: BuildDistOptions): {
  manifest: ManifestData;
  report: BuildDistReport;
} {
  const rootDir = options.rootDir;
  const distDir = options.distDir ?? path.join(rootDir, 'dist');
  const distDataDir = path.join(distDir, 'data');
  const distStoryDir = path.join(distDataDir, 'story');

  const upstreamDir = path.join(rootDir, 'data', 'upstream');
  const localDir = path.join(rootDir, 'data', 'local');
  const aiDir = path.join(rootDir, 'data', 'ai');
  const priorityDirs = [upstreamDir, localDir, aiDir];

  fs.mkdirSync(distDir, { recursive: true });
  fs.rmSync(distDataDir, { recursive: true, force: true });
  fs.mkdirSync(distStoryDir, { recursive: true });

  // 1. Merge and emit hashed story CSVs + story-index.json
  const storyMerge = mergeStoryLayers({
    upstreamDir,
    localDir,
    aiDir,
    baseDir: rootDir,
  });

  const usedHashes = new Map<string, string>();
  const storyIndex: StoryIndexTuple[] = [];
  let upstreamStories = 0;
  let localStories = 0;
  let aiStories = 0;

  const sortedPaths = Array.from(storyMerge.stories.keys()).sort((a, b) => a.localeCompare(b));
  for (const logicalPath of sortedPaths) {
    const entry = storyMerge.stories.get(logicalPath)!;
    const fullHash = sha256Hex(entry.content);
    let shortHash = fullHash.slice(0, 8);
    const prevFull = usedHashes.get(shortHash);
    if (prevFull && prevFull !== fullHash) {
      shortHash = fullHash.slice(0, 12);
    }
    usedHashes.set(shortHash, fullHash);

    writeTextUtf8(path.join(distStoryDir, `${shortHash}.csv`), entry.content);
    storyIndex.push(entry.isAI ? [logicalPath, shortHash, true] : [logicalPath, shortHash]);

    if (entry.tier === 'upstream') upstreamStories += 1;
    else if (entry.tier === 'local') localStories += 1;
    else aiStories += 1;
  }

  writeTextUtf8(path.join(distDir, 'story-index.json'), JSON.stringify(storyIndex));

  // 2. Merge top-level dictionary CSVs
  for (const spec of TOP_LEVEL_CSVS) {
    const contents: string[] = [];
    for (const dir of priorityDirs) {
      const f = path.join(dir, spec.file);
      if (fs.existsSync(f)) contents.push(readTextUtf8(f));
    }
    if (contents.length === 0) continue;
    const merged = mergeCsvRowsByPriority(contents, spec.keyCol, spec.valCol);
    if (merged) {
      writeTextUtf8(path.join(distDataDir, spec.file), merged);
    }
  }

  // 3. Merge type-text.csv + type-text/**/*.csv
  const mergedTypeText = mergeTypeTextLayers(priorityDirs);
  if (mergedTypeText) {
    writeTextUtf8(path.join(distDataDir, 'type-text.csv'), mergedTypeText);
  }

  // 4. Copy & overlay etc/*.csv, picture/, font/ (upstream highest for text tables)
  // For UI image atlases & etc/image.csv, local overrides upstream so freshly redrawn
  // newer-version UI atlases supersede outdated upstream atlases.
  const overlayOrder = [aiDir, localDir, upstreamDir];
  for (const dir of overlayOrder) {
    copyTree(path.join(dir, 'etc'), path.join(distDataDir, 'etc'));
    copyTree(path.join(dir, 'picture'), path.join(distDataDir, 'picture'));
    copyTree(path.join(dir, 'font'), path.join(distDataDir, 'font'));
  }

  for (const dir of [aiDir, upstreamDir, localDir]) {
    copyTree(path.join(dir, 'image'), path.join(distDataDir, 'image'));
  }

  // Merge etc/image.csv by `name` with local taking precedence over upstream
  const imageCsvSources: string[] = [];
  for (const dir of [localDir, upstreamDir, aiDir]) {
    const f = path.join(dir, 'etc', 'image.csv');
    if (fs.existsSync(f)) imageCsvSources.push(readTextUtf8(f));
  }
  if (imageCsvSources.length > 0) {
    const mergedImageCsv = mergeCsvRowsByPriority(imageCsvSources, 'name', 'version');
    if (mergedImageCsv) {
      writeTextUtf8(path.join(distDataDir, 'etc', 'image.csv'), mergedImageCsv);
    }
  }

  // 5. Build picture.json index
  const distPictureDir = path.join(distDataDir, 'picture');
  const pictureEntries: Array<[string, string]> = [];
  if (fs.existsSync(distPictureDir)) {
    for (const file of walkFiles(distPictureDir)) {
      const rel = toPosixPath(path.relative(distPictureDir, file));
      pictureEntries.push([rel, sha256File(file).slice(0, 8)]);
    }
  }
  writeTextUtf8(path.join(distDir, 'picture.json'), JSON.stringify(pictureEntries));

  // 6. Hash non-story published files for manifest.json
  const filesMap: Record<string, string> = {};
  filesMap['story-index.json'] = sha256File(path.join(distDir, 'story-index.json')).slice(0, 8);
  filesMap['picture.json'] = sha256File(path.join(distDir, 'picture.json')).slice(0, 8);

  for (const file of walkFiles(distDataDir)) {
    const relFromDist = toPosixPath(path.relative(distDir, file));
    if (relFromDist.startsWith('data/story/')) continue;
    filesMap[relFromDist] = sha256File(file).slice(0, 8);
  }

  const version = options.version ?? readPackageVersion(rootDir);
  const generatedAt = new Date().toISOString();
  const upstreamMeta = readUpstreamMeta(upstreamDir);
  const upstreamCommit = upstreamMeta?.commit ?? 'local-dev';

  const manifest: ManifestData = {
    version,
    generatedAt,
    upstreamCommit,
    files: filesMap,
    moduleHints: getDefaultModuleHints(),
  };

  const report: BuildDistReport = {
    version,
    generatedAt,
    upstreamCommit,
    stats: {
      stories: storyIndex.length,
      upstreamStories,
      localStories,
      aiStories,
      supersededAiCount: storyMerge.supersededAi.length,
      skippedNoInfoCount: storyMerge.skippedNoInfo.length,
      pictures: pictureEntries.length,
      indexedFiles: Object.keys(filesMap).length,
    },
    supersededAi: storyMerge.supersededAi,
  };

  writeTextUtf8(path.join(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeTextUtf8(path.join(distDir, 'build-report.json'), JSON.stringify(report, null, 2) + '\n');
  writeTextUtf8(path.join(distDir, 'index.html'), renderInstallPage(manifest, report));
  writeTextUtf8(path.join(distDir, '.nojekyll'), '');

  console.info(
    `[pipeline:build] Built ${report.stats.stories} stories (upstream=${upstreamStories}, local=${localStories}, ai=${aiStories}, supersededAI=${report.stats.supersededAiCount}), ${report.stats.indexedFiles} manifest files.`,
  );

  return { manifest, report };
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  buildDataDist({ rootDir });
}
