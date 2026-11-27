import fs from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';
import { normalizeStoryPath, trimSpaces } from '../src/core/normalize';
import { readTextUtf8, toPosixPath, walkFiles } from './utils';

export type DataLayerTier = 'upstream' | 'local' | 'ai';

export interface MergedStoryEntry {
  infoPath: string;
  sourceFile: string;
  tier: DataLayerTier;
  translator: string;
  isAI: boolean;
  content: string;
}

export interface SupersededAiEntry {
  infoPath: string;
  aiFile: string;
  winnerTier: DataLayerTier;
  winnerFile: string;
}

export interface StoryMergeResult {
  stories: Map<string, MergedStoryEntry>;
  supersededAi: SupersededAiEntry[];
  skippedNoInfo: string[];
  duplicates: Array<{ infoPath: string; kept: string; ignored: string; tier: DataLayerTier }>;
}

function extractStoryMeta(csvText: string): { infoPath: string | null; translator: string } {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });
  let infoPath: string | null = null;
  let translator = '';
  for (let i = parsed.data.length - 1; i >= 0; i--) {
    const row = parsed.data[i];
    const id = trimSpaces(row.id);
    const name = trimSpaces(row.name);
    if (!infoPath && id === 'info' && name) {
      infoPath = normalizeStoryPath(name);
    } else if (!translator && (id === '译者' || id === 'translator') && name) {
      translator = name;
    }
    if (infoPath && translator) break;
  }
  return { infoPath, translator };
}

/**
 * Merges story CSVs across tiers with strict priority:
 * upstream (community human) > local (project human) > ai (LLM fallback).
 */
export function mergeStoryLayers(options: {
  upstreamDir?: string;
  localDir?: string;
  aiDir?: string;
  baseDir?: string;
}): StoryMergeResult {
  const stories = new Map<string, MergedStoryEntry>();
  const supersededAi: SupersededAiEntry[] = [];
  const skippedNoInfo: string[] = [];
  const duplicates: StoryMergeResult['duplicates'] = [];

  const tiers: Array<{ tier: DataLayerTier; dir?: string }> = [
    { tier: 'upstream', dir: options.upstreamDir },
    { tier: 'local', dir: options.localDir },
    { tier: 'ai', dir: options.aiDir },
  ];

  for (const { tier, dir } of tiers) {
    if (!dir) continue;
    const storyRoot = path.join(dir, 'story');
    if (!fs.existsSync(storyRoot)) continue;

    const files = walkFiles(storyRoot).filter((f) => f.toLowerCase().endsWith('.csv'));
    for (const file of files) {
      const label = options.baseDir ? toPosixPath(path.relative(options.baseDir, file)) : toPosixPath(file);
      const content = readTextUtf8(file);
      const { infoPath, translator } = extractStoryMeta(content);
      if (!infoPath) {
        skippedNoInfo.push(label);
        continue;
      }

      const existing = stories.get(infoPath);
      if (existing) {
        if (tier === 'ai' && existing.tier !== 'ai') {
          supersededAi.push({
            infoPath,
            aiFile: label,
            winnerTier: existing.tier,
            winnerFile: existing.sourceFile,
          });
        } else {
          duplicates.push({
            infoPath,
            kept: existing.sourceFile,
            ignored: label,
            tier,
          });
        }
        continue;
      }

      const isAI = tier === 'ai' || /^AI(?:\(|$|\s)/i.test(translator);
      stories.set(infoPath, {
        infoPath,
        sourceFile: label,
        tier,
        translator,
        isAI,
        content,
      });
    }
  }

  return { stories, supersededAi, skippedNoInfo, duplicates };
}

/**
 * Merges tabular CSV files by key column with priority `upstream > local > ai`
 * (first non-empty translation wins).
 */
export function mergeCsvRowsByPriority(
  csvContentsInPriorityOrder: readonly string[],
  keyColumn: string,
  valueColumn = 'trans',
): string | null {
  const seen = new Map<string, Record<string, string>>();
  let headerFields: string[] | null = null;

  for (const raw of csvContentsInPriorityOrder) {
    const parsed = Papa.parse<Record<string, string>>(raw, {
      header: true,
      skipEmptyLines: true,
    });
    if (!headerFields && parsed.meta.fields && parsed.meta.fields.length > 0) {
      headerFields = parsed.meta.fields;
    }
    for (const row of parsed.data) {
      const key = trimSpaces(row[keyColumn]);
      if (!key) continue;
      const val = row[valueColumn];
      if (valueColumn && (!val || !val.trim())) continue;
      if (!seen.has(key)) {
        seen.set(key, row);
      }
    }
  }

  if (!headerFields || seen.size === 0) return null;
  return (
    Papa.unparse(Array.from(seen.values()), {
      columns: headerFields,
      newline: '\n',
    }) + '\n'
  );
}

/**
 * Merges both `type-text.csv` and `type-text/**\/*.csv` across priority tiers into one CSV.
 */
export function mergeTypeTextLayers(layerDirs: readonly string[]): string | null {
  const sources: string[] = [];
  for (const dir of layerDirs) {
    if (!fs.existsSync(dir)) continue;
    const subDir = path.join(dir, 'type-text');
    if (fs.existsSync(subDir)) {
      const subFiles = walkFiles(subDir).filter((f) => f.toLowerCase().endsWith('.csv'));
      for (const f of subFiles) {
        sources.push(readTextUtf8(f));
      }
    }
    const rootFile = path.join(dir, 'type-text.csv');
    if (fs.existsSync(rootFile)) {
      sources.push(readTextUtf8(rootFile));
    }
  }
  return mergeCsvRowsByPriority(sources, 'text', 'trans');
}
