import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyTree } from './utils';

export function deployDistToGhPages(options: {
  rootDir: string;
  distDir?: string;
  remote?: string;
  branch?: string;
}): void {
  const rootDir = options.rootDir;
  const distDir = options.distDir ?? path.join(rootDir, 'dist');
  const remote = options.remote ?? 'origin';
  const branch = options.branch ?? 'gh-pages';

  if (!fs.existsSync(path.join(distDir, 'manifest.json'))) {
    throw new Error(`Missing ${path.join(distDir, 'manifest.json')}. Run pipeline:build first.`);
  }

  const remoteUrl = execFileSync('git', ['-C', rootDir, 'remote', 'get-url', remote], {
    encoding: 'utf8',
  }).trim();
  const userName = execFileSync('git', ['-C', rootDir, 'config', 'user.name'], {
    encoding: 'utf8',
  }).trim() || 'ShinyColors-zh Bot';
  const userEmail = execFileSync('git', ['-C', rootDir, 'config', 'user.email'], {
    encoding: 'utf8',
  }).trim() || 'noreply@users.noreply.github.com';

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sczh-ghpages-'));
  try {
    console.info(`[pipeline:deploy] Staging dist/ into temporary orphan ${branch} repo...`);
    const copied = copyTree(distDir, tmpDir);
    console.info(`[pipeline:deploy] Staged ${copied} files.`);

    const runGit = (args: string[]): void => {
      execFileSync('git', ['-C', tmpDir, ...args], { stdio: 'inherit' });
    };

    runGit(['init', '-b', branch]);
    runGit(['config', 'core.autocrlf', 'false']);
    runGit(['config', 'core.quotepath', 'false']);
    runGit(['config', 'user.name', userName]);
    runGit(['config', 'user.email', userEmail]);
    runGit(['add', '-A']);
    runGit(['commit', '-m', `deploy: publish ShinyColors-zh (${new Date().toISOString()})`]);
    runGit(['remote', 'add', 'origin', remoteUrl]);
    runGit(['push', '--force', 'origin', branch]);

    console.info(`[pipeline:deploy] Pushed ${branch} to ${remoteUrl}`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  deployDistToGhPages({ rootDir });
}
