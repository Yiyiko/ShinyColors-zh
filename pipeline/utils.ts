import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function toPosixPath(p: string): string {
  return p.split(path.sep).join('/');
}

export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function readTextUtf8(filePath: string): string {
  return stripBom(fs.readFileSync(filePath, 'utf8'));
}

export function writeTextUtf8(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content.replace(/\r\n/g, '\n'), 'utf8');
}

export function sha256Hex(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function sha256File(filePath: string): string {
  return sha256Hex(fs.readFileSync(filePath));
}

export function walkFiles(rootDir: string): string[] {
  if (!fs.existsSync(rootDir)) return [];
  const results: string[] = [];
  const visit = (dir: string): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === '.gitkeep') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
      } else if (entry.isFile()) {
        results.push(full);
      }
    }
  };
  visit(rootDir);
  results.sort((a, b) => toPosixPath(a).localeCompare(toPosixPath(b)));
  return results;
}

export function clearDirKeepGitkeep(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
  for (const entry of fs.readdirSync(dir)) {
    if (entry === '.gitkeep') continue;
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
  }
}

export function copyTree(srcDir: string, destDir: string): number {
  if (!fs.existsSync(srcDir)) return 0;
  let count = 0;
  const files = walkFiles(srcDir);
  for (const srcFile of files) {
    const rel = path.relative(srcDir, srcFile);
    const destFile = path.join(destDir, rel);
    fs.mkdirSync(path.dirname(destFile), { recursive: true });
    fs.copyFileSync(srcFile, destFile);
    count += 1;
  }
  return count;
}
