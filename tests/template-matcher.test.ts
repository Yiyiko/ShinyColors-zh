import { describe, expect, it } from 'vitest';
import { compileTemplateCsv, TemplateTextMatcher } from '../src/core/template-matcher';

describe('TemplateTextMatcher (community text,trans,type rules)', () => {
  it('compiles $noun, $percent, $num, $uk, $name placeholders and respects longest-first matching', () => {
    const csv = [
      'text,trans,type',
      'Vocal,Vo,noun',
      'Vocal&Dance,Vo&Da,noun',
      'アピール,Appeal,noun',
      '$noun$percentUP,$1提升$2,',
      'プロデュース開始時に絆$num,培育开始时羁绊$1,',
      '$nameのファン人数を$num人にする,让$1的粉丝数达到$2人,',
      'フェスをプレイしよう,进行1次Fes,text',
    ].join('\n');

    const dict = compileTemplateCsv(csv, {
      nameMap: new Map([
        ['櫻木真乃', '樱木真乃'],
        ['八宮めぐる', '八宫巡'],
      ]),
    });
    const matcher = new TemplateTextMatcher(dict);

    expect(matcher.translate('フェスをプレイしよう')).toBe('进行1次Fes');
    expect(matcher.translate('Vocal&Dance50%UP')).toBe('Vo&Da提升50%');
    expect(matcher.translate('Vocal20%UP')).toBe('Vo提升20%');
    expect(matcher.translate('プロデュース開始時に絆+10')).toBe('培育开始时羁绊+10');
    expect(matcher.translate('八宮めぐるのファン人数を1億人にする')).toBe('让八宫巡的粉丝数达到1亿人');
  });
});
