import { describe, expect, it } from 'vitest';
import { APP_NAME, APP_VERSION, DATA_SOURCES, REPO_NAME, REPO_OWNER } from '../src/meta';

describe('P0 project metadata', () => {
  it('exposes valid project identity and fallback data sources', () => {
    expect(APP_NAME).toBe('ShinyColors-zh');
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(REPO_OWNER).toBe('Yiyiko');
    expect(REPO_NAME).toBe('ShinyColors-zh');
    expect(DATA_SOURCES).toHaveLength(2);
    expect(DATA_SOURCES[0]).toContain(`${REPO_OWNER}.github.io/${REPO_NAME}`);
    expect(DATA_SOURCES[1]).toContain(`cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}@gh-pages`);
  });
});
