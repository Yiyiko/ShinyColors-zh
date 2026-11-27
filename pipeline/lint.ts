import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';
import { decodeCsvNewlines, trimSpaces } from '../src/core/normalize';
import { readTextUtf8, toPosixPath, walkFiles } from './utils';

export type LintSeverity = 'error' | 'warning';

export interface LintIssue {
  file: string;
  line: number;
  severity: LintSeverity;
  rule: string;
  message: string;
}

export interface LintSummary {
  filesChecked: number;
  errors: LintIssue[];
  warnings: LintIssue[];
}

/**
 * Character / unit canonical names from ShinyGroup/SCTranslationData `翻译格式和规范.md`.
 * Flag untranslated Japanese character names left inside Chinese translation strings.
 */
const UNTRANSLATED_NAME_PAIRS: ReadonlyArray<[jp: string, zh: string]> = [
  ['櫻木真乃', '樱木真乃'],
  ['風野灯織', '风野灯织'],
  ['八宮めぐる', '八宫巡'],
  ['月岡恋鐘', '月冈恋钟'],
  ['田中摩美々', '田中摩美美'],
  ['白瀬咲耶', '白濑咲耶'],
  ['三峰結華', '三峰结华'],
  ['幽谷霧子', '幽谷雾子'],
  ['小宮果穂', '小宫果穗'],
  ['園田智代子', '园田智代子'],
  ['西城樹里', '西城树里'],
  ['有栖川夏葉', '有栖川夏叶'],
  ['芹沢あさひ', '芹泽朝日'],
  ['黛冬優子', '黛冬优子'],
  ['浅倉透', '浅仓透'],
  ['樋口円香', '樋口圆香'],
  ['市川雛菜', '市川雏菜'],
  ['七草にちか', '七草日花'],
  ['緋田美琴', '绯田美琴'],
];

export function lintStoryCsvContent(
  csvText: string,
  fileLabel: string,
  options: { requireTranslator?: boolean } = {},
): LintIssue[] {
  const issues: LintIssue[] = [];
  const requireTranslator = options.requireTranslator ?? true;

  if (csvText.includes('\uFFFD')) {
    issues.push({
      file: fileLabel,
      line: 1,
      severity: 'error',
      rule: 'utf8-encoding',
      message: 'File contains UTF-8 replacement character (U+FFFD)',
    });
  }

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    for (const err of parsed.errors.slice(0, 5)) {
      issues.push({
        file: fileLabel,
        line: (err.row ?? 0) + 2,
        severity: 'error',
        rule: 'csv-parse',
        message: err.message,
      });
    }
  }

  const fields = parsed.meta.fields ?? [];
  const requiredCols = ['id', 'name', 'text', 'trans'];
  for (const col of requiredCols) {
    if (!fields.includes(col)) {
      issues.push({
        file: fileLabel,
        line: 1,
        severity: 'error',
        rule: 'csv-columns',
        message: `Missing required header column "${col}"`,
      });
    }
  }

  let hasInfo = false;
  let hasTranslator = false;

  parsed.data.forEach((row, idx) => {
    const lineNo = idx + 2;
    const id = trimSpaces(row.id);
    const name = trimSpaces(row.name);
    const transRaw = row.trans ?? '';

    if (id === 'info') {
      if (name) hasInfo = true;
      else {
        issues.push({
          file: fileLabel,
          line: lineNo,
          severity: 'error',
          rule: 'info-empty',
          message: '"info" row has empty story path',
        });
      }
      return;
    }

    if (id === '译者' || id === 'translator') {
      if (name) hasTranslator = true;
      return;
    }

    if (!transRaw.trim()) return;
    const trans = decodeCsvNewlines(transRaw, true);

    // Punctuation checks per community style guide (warnings, non-blocking)
    if (/[『』]/.test(trans)) {
      issues.push({
        file: fileLabel,
        line: lineNo,
        severity: 'warning',
        rule: 'punct-quotes',
        message: 'Avoid Japanese quotes『』; use “” or 《》',
      });
    }
    if (trans.includes('~')) {
      issues.push({
        file: fileLabel,
        line: lineNo,
        severity: 'warning',
        rule: 'punct-tilde',
        message: 'Use full-width tilde（～）instead of half-width (~)',
      });
    }
    if (/\.\.\./.test(trans) || /(?:^|[^…])…(?:[^…]|$)/.test(trans)) {
      issues.push({
        file: fileLabel,
        line: lineNo,
        severity: 'warning',
        rule: 'punct-ellipsis',
        message: 'Use standard Chinese ellipsis（……）instead of ... or single …',
      });
    }
    if (/[\u4e00-\u9fff],[\u4e00-\u9fff]/.test(trans)) {
      issues.push({
        file: fileLabel,
        line: lineNo,
        severity: 'warning',
        rule: 'punct-comma',
        message: 'Use full-width comma（，）between Chinese characters',
      });
    }
    if (/[\u4e00-\u9fff](?:酱|桑)(?:[，。！？～…,~!?\s”」]|$)/.test(trans)) {
      issues.push({
        file: fileLabel,
        line: lineNo,
        severity: 'warning',
        rule: 'honorific-style',
        message: 'Community guide discourages translating ちゃん/さん as 酱/桑',
      });
    }

    for (const [jp, zh] of UNTRANSLATED_NAME_PAIRS) {
      if (trans.includes(jp)) {
        issues.push({
          file: fileLabel,
          line: lineNo,
          severity: 'warning',
          rule: 'canonical-name',
          message: `Found untranslated name "${jp}", expected "${zh}"`,
        });
      }
    }

    // Line-length advisory checks (11 chars for select, 17 chars for speech lines)
    const maxLen = id === 'select' ? 11 : 17;
    const lines = trans.split('\n');
    for (const l of lines) {
      if (l.length > maxLen) {
        issues.push({
          file: fileLabel,
          line: lineNo,
          severity: 'warning',
          rule: id === 'select' ? 'select-line-length' : 'text-line-length',
          message: `Line length ${l.length} exceeds advisory limit ${maxLen}`,
        });
        break;
      }
    }
  });

  if (!hasInfo) {
    issues.push({
      file: fileLabel,
      line: 1,
      severity: 'error',
      rule: 'missing-info',
      message: 'Missing "info" row with logical story path',
    });
  }
  if (requireTranslator && !hasTranslator) {
    issues.push({
      file: fileLabel,
      line: 1,
      severity: 'error',
      rule: 'missing-translator',
      message: 'Missing "译者" row with translator attribution',
    });
  }

  return issues;
}

export function lintStoryDirectory(
  storyDir: string,
  options: { baseDir?: string; requireTranslator?: boolean } = {},
): LintSummary {
  const errors: LintIssue[] = [];
  const warnings: LintIssue[] = [];
  if (!fs.existsSync(storyDir)) {
    return { filesChecked: 0, errors, warnings };
  }

  const files = walkFiles(storyDir).filter((f) => f.toLowerCase().endsWith('.csv'));
  const baseDir = options.baseDir ?? storyDir;

  for (const file of files) {
    const label = toPosixPath(path.relative(baseDir, file));
    const content = readTextUtf8(file);
    const issues = lintStoryCsvContent(content, label, {
      requireTranslator: options.requireTranslator,
    });
    for (const issue of issues) {
      if (issue.severity === 'error') errors.push(issue);
      else warnings.push(issue);
    }
  }

  return { filesChecked: files.length, errors, warnings };
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const includeUpstream = process.argv.includes('--include-upstream');

  const localRes = lintStoryDirectory(path.join(rootDir, 'data', 'local', 'story'), {
    baseDir: rootDir,
    requireTranslator: true,
  });
  const aiRes = lintStoryDirectory(path.join(rootDir, 'data', 'ai', 'story'), {
    baseDir: rootDir,
    requireTranslator: true,
  });

  console.info(
    `[pipeline:lint] local: ${localRes.filesChecked} files, ${localRes.errors.length} errors, ${localRes.warnings.length} warnings`,
  );
  console.info(
    `[pipeline:lint] ai:    ${aiRes.filesChecked} files, ${aiRes.errors.length} errors, ${aiRes.warnings.length} warnings`,
  );

  if (includeUpstream) {
    const upRes = lintStoryDirectory(path.join(rootDir, 'data', 'upstream', 'story'), {
      baseDir: rootDir,
      requireTranslator: false,
    });
    console.info(
      `[pipeline:lint] upstream (advisory): ${upRes.filesChecked} files, ${upRes.errors.length} errors, ${upRes.warnings.length} warnings`,
    );
  }

  const blockingErrors = [...localRes.errors, ...aiRes.errors];
  if (blockingErrors.length > 0) {
    for (const err of blockingErrors.slice(0, 30)) {
      console.error(`  [ERROR] ${err.file}:${err.line} (${err.rule}) ${err.message}`);
    }
    process.exit(1);
  }
}
