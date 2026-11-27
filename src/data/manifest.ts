import type { ModuleName } from '../locator';
import type { DataCache } from './cache-idb';
import { fetchWithFallback, type TextFetcher } from './sources';

export interface ManifestData {
  version: string;
  generatedAt: string;
  upstreamCommit: string;
  files: Record<string, string>;
  moduleHints?: Partial<Record<ModuleName, number[]>>;
}

export type StoryIndexTuple = [logicalPath: string, hash: string, isAI?: boolean];

export interface LoadedManifest {
  manifest: ManifestData;
  source: string;
  fromCache: boolean;
}

const MANIFEST_CACHE_KEY = 'manifest.json';

export async function loadManifest(options: {
  cache: DataCache;
  sources?: readonly string[];
  fetcher?: TextFetcher;
  timeoutMs?: number;
}): Promise<LoadedManifest> {
  try {
    const res = await fetchWithFallback('manifest.json', {
      sources: options.sources,
      queryHash: String(Math.floor(Date.now() / 60_000)),
      timeoutMs: options.timeoutMs,
      fetcher: options.fetcher,
    });
    const manifest = JSON.parse(res.text) as ManifestData;
    await options.cache.set(MANIFEST_CACHE_KEY, manifest.version, manifest);
    return { manifest, source: res.source, fromCache: false };
  } catch (err) {
    const cached = await options.cache.get<ManifestData>(MANIFEST_CACHE_KEY);
    if (cached) {
      return { manifest: cached.value, source: 'IndexedDB (offline fallback)', fromCache: true };
    }
    throw err;
  }
}

export async function loadCachedTextFile(
  relPath: string,
  expectedHash: string,
  options: {
    cache: DataCache;
    sources?: readonly string[];
    fetcher?: TextFetcher;
    timeoutMs?: number;
  },
): Promise<{ text: string; fromCache: boolean; source: string }> {
  const cached = await options.cache.get<string>(relPath);
  if (cached && cached.hash === expectedHash) {
    return { text: cached.value, fromCache: true, source: 'cache' };
  }

  const res = await fetchWithFallback(relPath, {
    sources: options.sources,
    queryHash: expectedHash,
    timeoutMs: options.timeoutMs,
    fetcher: options.fetcher,
  });
  await options.cache.set(relPath, expectedHash, res.text);
  return { text: res.text, fromCache: false, source: res.source };
}
