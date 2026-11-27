import { describe, expect, it } from 'vitest';
import { applyStoryTranslation, translateSpeaker } from '../src/core/story-matcher';
import { parseStoryCsv } from '../src/data/csv';

describe('Story translation matching engine', () => {
  it('matches by 13-digit ID, duplicate text occurrence, common fallback, select, and compound speakers', () => {
    const storyCsv = parseStoryCsv(
      [
        'id,name,text,trans',
        '4901600010010,真乃,おはよう,早上好',
        '0000000000000,真乃,……！,……！（第一次）',
        '0000000000000,真乃,……！,……！（第二次）',
        'select,,行く,出发',
        'info,mypage_communications/490160001.json,,',
        '译者,社区译者,,',
      ].join('\n'),
    );

    const commMap = new Map<string, string>([['お疲れ様です', '辛苦了']]);
    const nameMap = new Map<string, string>([
      ['真乃', '真乃'],
      ['灯織', '灯织'],
      ['スタッフ', '工作人员'],
    ]);

    const items = [
      { id: '4901600010010', speaker: '真乃', text: 'おはよう' },
      { speaker: '真乃＆灯織', text: '……！' },
      { speaker: 'スタッフ1', text: '……！' },
      { speaker: '灯織', text: 'お疲れ様です' },
      { select: '行く' },
      { speaker: '真乃', text: '未翻訳テキスト' },
    ];

    const stats = applyStoryTranslation(items, { story: storyCsv, commMap, nameMap });

    expect(items[0].text).toBe('早上好');
    expect(items[1].text).toBe('……！（第一次）');
    expect(items[1].speaker).toBe('真乃＆灯织');
    expect(items[2].text).toBe('……！（第二次）');
    expect(items[2].speaker).toBe('工作人员1');
    expect(items[3].text).toBe('辛苦了');
    expect(items[4].select).toBe('出发');
    expect(items[5].text).toBe('未翻訳テキスト');

    expect(stats.totalLines).toBe(5);
    expect(stats.matchedLines).toBe(4);
    expect(stats.matchedById).toBe(1);
    expect(stats.matchedByText).toBe(2);
    expect(stats.matchedByComm).toBe(1);
    expect(stats.matchedSelects).toBe(1);
    expect(stats.coveragePct).toBe(83.3);
  });

  it('handles full-width digits and ampersand variants in speaker names', () => {
    const nameMap = new Map([
      ['ファン', '粉丝'],
      ['めぐる', '巡'],
      ['真乃', '真乃'],
    ]);
    expect(translateSpeaker('ファン２', nameMap)).toBe('粉丝２');
    expect(translateSpeaker('めぐる&真乃', nameMap)).toBe('巡&真乃');
  });
});
