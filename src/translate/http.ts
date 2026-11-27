export interface MtHttpRequest {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export interface MtHttpResponse {
  status: number;
  text: string;
}

export type MtHttpClient = (req: MtHttpRequest) => Promise<MtHttpResponse>;

function gmRequest(req: MtHttpRequest): Promise<MtHttpResponse> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: req.method ?? 'GET',
      url: req.url,
      headers: req.headers,
      data: req.body,
      timeout: req.timeoutMs ?? 30_000,
      onload: (res) => {
        resolve({ status: res.status, text: res.responseText });
      },
      onerror: (err) => {
        reject(new Error(`GM_xmlhttpRequest network error: ${String((err as { error?: unknown })?.error ?? err)}`));
      },
      ontimeout: () => {
        reject(new Error(`Request timeout (${req.timeoutMs ?? 30_000}ms)`));
      },
    });
  });
}

async function fetchRequest(req: MtHttpRequest): Promise<MtHttpResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 30_000);
  try {
    const res = await fetch(req.url, {
      method: req.method ?? 'GET',
      headers: req.headers,
      body: req.body,
      signal: controller.signal,
    });
    const text = await res.text();
    return { status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

export const defaultMtHttpClient: MtHttpClient = (req) => {
  if (typeof GM_xmlhttpRequest === 'function') {
    return gmRequest(req);
  }
  return fetchRequest(req);
};
