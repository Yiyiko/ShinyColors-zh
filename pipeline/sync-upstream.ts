import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clearDirKeepGitkeep, copyTree, writeTextUtf8 } from './utils';

export interface UpstreamMeta {
  repo: string;
  branch: string;
  commit: string;
  committedAt: string;
  syncedAt: string;
  fileCount: number;
}

export function syncUpstream(options: {
  rootDir: string;
  repoUrl?: string;
  branch?: string;
}): UpstreamMeta {
  const repo = options.repoUrl ?? process.env.UPSTREAM_REPO ?? 'https://github.com/ShinyGroup/SCTranslationData.git';
  const branch = options.branch ?? process.env.UPSTREAM_BRANCH ?? 'master';
  const upstreamDir = path.join(options.rootDir, 'data', 'upstream');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sczh-upstream-'));

  try {
    console.info(`[pipeline:sync] Cloning ${repo} (${branch})...`);
    execFileSync(
      'git',
      ['clone', '--depth', '1', '--branch', branch, '--single-branch', repo, tmpDir],
      { stdio: 'inherit' },
    );

    const commit = execFileSync('git', ['-C', tmpDir, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
    const committedAt = execFileSync('git', ['-C', tmpDir, 'log', '-1', '--format=%cI'], {
      encoding: 'utf8',
    }).trim();

    const srcDataDir = path.join(tmpDir, 'data');
    if (!fs.existsSync(srcDataDir)) {
      throw new Error(`Upstream repository does not contain data/ directory at ${srcDataDir}`);
    }

    clearDirKeepGitkeep(upstreamDir);
    const fileCount = copyTree(srcDataDir, upstreamDir);

    const meta: UpstreamMeta = {
      repo,
      branch,
      commit,
      committedAt,
      syncedAt: new Date().toISOString(),
      fileCount,
    };
    writeTextUtf8(
      path.join(upstreamDir, '.upstream-meta.json'),
      JSON.stringify(meta, null, 2) + '\n',
    );

    console.info(
      `[pipeline:sync] Synced ${fileCount} files from ${commit.slice(0, 8)} (${committedAt}).`,
    );
    return meta;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  syncUpstream({ rootDir });
}
