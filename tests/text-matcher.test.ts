import { describe, expect, it } from 'vitest';
import { PixiTextMatcher, STORY_TAG_MARKER } from '../src/core/text-matcher';

describe('PIXI text matcher with typewriter protection', () => {
  it('translates typeText and prevents partial frames from being corrupted by commonMap', () => {
    let clock = 1000;
    const matcher = new PixiTextMatcher({
      commonMap: new Map([
        ['今', '错误静态替换'],
        ['ホーム', '主页'],
      ]),
      typeTextMap: new Map([['今日も頑張ろう！', '今天也要加油哦！']]),
      typingTtlMs: 5000,
      now: () => clock,
    });

    // 1. Typewriter starts
    expect(matcher.translateTypeText('今日も頑張ろう！')).toBe('今天也要加油哦！');
    // 2. Partial prefix frame during typing must NOT be replaced by commonMap
    expect(matcher.translateStaticText('今')).toBe('今');
    expect(matcher.translateStaticText('今天也要')).toBe('今天也要');
    // 3. Unrelated static UI text still translates normally
    expect(matcher.translateStaticText('ホーム')).toBe('主页');
    // 4. Story-tagged text must never be re-translated
    expect(matcher.translateStaticText(`${STORY_TAG_MARKER}ホーム`)).toBe(`${STORY_TAG_MARKER}ホーム`);
    // 5. After TTL expires, static dictionary applies again
    clock += 6000;
    expect(matcher.translateStaticText('今')).toBe('错误静态替换');
  });
});
