import { describe, expect, it } from 'vitest';
import { exportStoryToCsv, parseKeyValueCsv, parseStoryCsv } from '../src/data/csv';

describe('Community CSV parser and exporter', () => {
  it('parses UTF-8 BOM, line IDs, duplicate IDs, zero IDs, select, info, and translator', () => {
    const csv =
      '\uFEFFid,name,text,trans\n' +
      '0000000000000,プロデューサー,ふー……間に合った……！\\nこれで今月の仕事はなんとか……！,呼……总算是赶上了……！\\n这样一来，这个月的工作……！\n' +
      '4901600010010,真乃,────ニンゲン……プロデューサー、さん……？,————有人类……是制作人……？\n' +
      '4901600010010,真乃,同じIDの2行目,同 ID 第二行译文\n' +
      'select,,選択肢原文,选项译文\n' +
      'info,mypage_communications/490160001.json,,\n' +
      '译者,测试译者,,\n';

    const parsed = parseStoryCsv(csv);
    expect(parsed.infoPath).toBe('mypage_communications/490160001.json');
    expect(parsed.translator).toBe('测试译者');
    expect(parsed.isAI).toBe(false);
    expect(parsed.byId.get('4901600010010')).toBe('————有人类……是制作人……？');
    expect(parsed.byId.get('4901600010010-0')).toBe('同 ID 第二行译文');
    expect(parsed.byText.get('ふー……間に合った……！\nこれで今月の仕事はなんとか……！')).toBe(
      '呼……总算是赶上了……！\n这样一来，这个月的工作……！',
    );
    expect(parsed.bySelect.get('選択肢原文')).toBe('选项译文');
  });

  it('flags AI translator rows properly', () => {
    const csv = 'id,name,text,trans\ninfo,produce_events/1001.json,,\n译者,AI(Gemini),,\n';
    const parsed = parseStoryCsv(csv);
    expect(parsed.isAI).toBe(true);
    expect(parsed.translator).toBe('AI(Gemini)');
  });

  it('exports runtime story entries to standard community CSV format', () => {
    const out = exportStoryToCsv(
      [
        { id: '4901600010010', speaker: '真乃', text: '一行目\n二行目' },
        { speaker: 'プロデューサー', text: '無IDセリフ' },
        { select: 'はい' },
      ],
      '/assets/json/mypage_communications/490160001.json',
      '译者A',
    );
    expect(out).toContain('id,name,text,trans\n');
    expect(out).toContain('4901600010010,真乃,一行目\\n二行目,');
    expect(out).toContain('0000000000000,プロデューサー,無IDセリフ,');
    expect(out).toContain('select,,はい,');
    expect(out).toContain('info,mypage_communications/490160001.json,,');
    expect(out).toContain('译者,译者A,,');
  });

  it('parses generic key-value CSV dictionaries with BOM and escaped newlines', () => {
    const map = parseKeyValueCsv('\uFEFFtext,trans\nこんにちは\\n世界,你好\\n世界\n');
    expect(map.get('こんにちは\n世界')).toBe('你好\n世界');
  });
});
