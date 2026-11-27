import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createReconServer, sanitizeReconValue } from '../scripts/dev-server';

describe('P1 local recon dev-server', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('redacts sensitive credentials recursively', () => {
    const out = sanitizeReconValue({
      path: 'userMissions',
      headers: {
        authorization: 'Bearer secret',
        'x-sessionid': 'sess_12345',
        safeHeader: 'ok',
      },
      nested: { userToken: 'abc', title: 'ミッション' },
    }) as Record<string, any>;

    expect(out.headers.authorization).toBe('[REDACTED]');
    expect(out.headers['x-sessionid']).toBe('[REDACTED]');
    expect(out.headers.safeHeader).toBe('ok');
    expect(out.nested.userToken).toBe('[REDACTED]');
    expect(out.nested.title).toBe('ミッション');
  });

  it('accepts POST /report, sanitizes payload, saves fixtures, and reports /status', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sczh-recon-'));
    tempDirs.push(tmp);
    const server = createReconServer({ rootDir: tmp, host: '127.0.0.1', port: 0 });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      const storyRes = await fetch(`http://127.0.0.1:${port}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'story',
          path: '/assets/json/mypage_communications/490160001.json',
          accessToken: 'should-be-redacted',
          data: [{ id: '4901600010010', speaker: '真乃', text: 'テスト' }],
        }),
      });
      expect(storyRes.status).toBe(200);
      const saved = (await storyRes.json()) as { ok: boolean; savedPath: string };
      expect(saved.ok).toBe(true);
      expect(fs.existsSync(saved.savedPath)).toBe(true);

      const fileContent = JSON.parse(fs.readFileSync(saved.savedPath, 'utf8'));
      expect(fileContent.accessToken).toBe('[REDACTED]');

      const statusRes = await fetch(`http://127.0.0.1:${port}/status`);
      const statusJson = (await statusRes.json()) as { reportsReceived: number; storiesSaved: string[] };
      expect(statusJson.reportsReceived).toBe(1);
      expect(statusJson.storiesSaved).toContain('/assets/json/mypage_communications/490160001.json');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
