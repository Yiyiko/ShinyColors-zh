import { DATA_SOURCES } from '../meta';

export interface FetchTextResult {
  source: string;
  url: string;
  text: string;
}

export type TextFetcher = (url: string, timeoutMs: number) => Promise<string>;

function joinUrl(base: string, relPath: string): string {
  const b = base.endsWith('/') ? base : `${base}/`;
  const p = relPath.replace(/^\/+/, '');
  return `${b}${p}`;
}

export async function defaultTextFetcher(url: string, timeoutMs: number): Promise<string> {
  if (typeof GM_xmlhttpRequest === 'function') {
    return new Promise<string>((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        timeout: timeoutMs,
        onload: (res) => {
          if (res.status >= 200 && res.status < 300) {
            resolve(res.responseText);
          } else {
            reject(new Error(`HTTP ${res.status} for ${url}`));
          }
        },
        onerror: () => reject(new Error(`Network error for ${url}`)),
        ontimeout: () => reject(new Error(`Timeout (${timeoutMs}ms) for ${url}`)),
      });
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export function buildSourceList(customSource?: string | null): string[] {
  const list: string[] = [];
  if (customSource && /^https?:\/\//i.test(customSource.trim())) {
    list.push(customSource.trim());
  }
  for (const src of DATA_SOURCES) {
    if (!list.includes(src)) list.push(src);
  }
  return list;
}

export async function fetchWithFallback(
  relPath: string,
  options: {
    sources?: readonly string[];
    queryHash?: string;
    timeoutMs?: number;
    fetcher?: TextFetcher;
  } = {},
): Promise<FetchTextResult> {
  const sources = options.sources ?? DATA_SOURCES;
  const timeoutMs = options.timeoutMs ?? 8000;
  const fetcher = options.fetcher ?? defaultTextFetcher;
  const suffix = options.queryHash ? `?v=${encodeURIComponent(options.queryHash)}` : '';

  const errors: string[] = [];
  for (const source of sources) {
    const url = joinUrl(source, relPath) + suffix;
    try {
      const text = await fetcher(url, timeoutMs);
      return { source, url, text };
    } catch (err) {
      errors.push(`${source}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(`All data sources failed for "${relPath}": ${errors.join('; ')}`);
}
