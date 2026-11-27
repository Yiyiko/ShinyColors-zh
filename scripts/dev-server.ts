import fs from 'node:fs';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SENSITIVE_KEY_RE =
  /(token|cookie|authorization|session|password|secret|credential|auth|email|phone|enzaid|userid|accountid|x-sessionid)/i;

export function sanitizeReconValue(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[MaxDepth]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (value.length > 1200) {
      return `${value.slice(0, 1200)}…[truncated:${value.length}]`;
    }
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.slice(0, 500).map((item) => sanitizeReconValue(item, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_RE.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = sanitizeReconValue(v, depth + 1);
      }
    }
    return out;
  }
  return String(value);
}

export function safeFileSlug(input: string): string {
  return input
    .replace(/^\/+/, '')
    .replace(/\.json$/i, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120) || 'sample';
}

export interface ReconServerOptions {
  rootDir: string;
  port?: number;
  host?: string;
}

export interface ReconPayload {
  kind?: 'summary' | 'story' | 'api';
  path?: string;
  data?: unknown;
  [key: string]: unknown;
}

export function createReconServer(options: ReconServerOptions): http.Server {
  const rootDir = options.rootDir;
  const reconDir = path.join(rootDir, 'docs', 'recon');
  const storyFixtureDir = path.join(rootDir, 'fixtures', 'story');
  const apiFixtureDir = path.join(rootDir, 'fixtures', 'api');
  const reconScriptPath = path.join(rootDir, 'dist', 'ShinyColors-zh-recon.user.js');

  const stats = {
    startedAt: new Date().toISOString(),
    reportsReceived: 0,
    storiesSaved: new Set<string>(),
    apisSaved: new Set<string>(),
    lastReportAt: null as string | null,
  };

  const setCors = (res: ServerResponse): void => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  };

  const readBody = (req: IncomingMessage): Promise<string> =>
    new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let total = 0;
      const limit = 10 * 1024 * 1024; // 10 MB
      req.on('data', (chunk: Buffer) => {
        total += chunk.length;
        if (total > limit) {
          reject(new Error('Payload too large'));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });

  return http.createServer(async (req, res) => {
    setCors(res);
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/status')) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify(
          {
            ok: true,
            reconScriptAvailable: fs.existsSync(reconScriptPath),
            installUrl: `http://${options.host ?? '127.0.0.1'}:${options.port ?? 8787}/recon.user.js`,
            reportsReceived: stats.reportsReceived,
            storiesSaved: Array.from(stats.storiesSaved),
            apisSaved: Array.from(stats.apisSaved),
            lastReportAt: stats.lastReportAt,
          },
          null,
          2,
        ),
      );
      return;
    }

    if (req.method === 'GET' && url.pathname === '/recon.user.js') {
      if (!fs.existsSync(reconScriptPath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Recon userscript not built yet. Run: pnpm run build:recon');
        return;
      }
      const content = fs.readFileSync(reconScriptPath, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(content);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/report') {
      try {
        const raw = await readBody(req);
        const parsed = JSON.parse(raw) as ReconPayload;
        const sanitized = sanitizeReconValue(parsed) as ReconPayload;

        fs.mkdirSync(reconDir, { recursive: true });
        stats.reportsReceived += 1;
        stats.lastReportAt = new Date().toISOString();

        let savedPath: string;
        if (sanitized.kind === 'story' && typeof sanitized.path === 'string') {
          fs.mkdirSync(storyFixtureDir, { recursive: true });
          const slug = safeFileSlug(sanitized.path);
          savedPath = path.join(storyFixtureDir, `${slug}.local.json`);
          fs.writeFileSync(savedPath, JSON.stringify(sanitized, null, 2) + '\n', 'utf8');
          stats.storiesSaved.add(sanitized.path);
        } else if (sanitized.kind === 'api' && typeof sanitized.path === 'string') {
          fs.mkdirSync(apiFixtureDir, { recursive: true });
          const slug = safeFileSlug(sanitized.path);
          savedPath = path.join(apiFixtureDir, `${slug}.local.json`);
          fs.writeFileSync(savedPath, JSON.stringify(sanitized, null, 2) + '\n', 'utf8');
          stats.apisSaved.add(sanitized.path);
        } else {
          savedPath = path.join(reconDir, 'runtime-report.local.json');
          fs.writeFileSync(savedPath, JSON.stringify(sanitized, null, 2) + '\n', 'utf8');
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, savedPath }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
      }
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'Not Found' }));
  });
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  const host = process.env.RECON_HOST ?? '127.0.0.1';
  const port = Number(process.env.RECON_PORT ?? 8787);
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const server = createReconServer({ rootDir, host, port });
  server.listen(port, host, () => {
    console.info(`[ShinyColors-zh Recon Server] listening on http://${host}:${port}`);
    console.info(`  Install recon script: http://${host}:${port}/recon.user.js`);
    console.info(`  Inspect status:       http://${host}:${port}/status`);
  });
}
