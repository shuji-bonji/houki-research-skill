import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  argNamesFromBraces,
  blankComments,
  extractInlineCalls,
  extractJsonCalls,
  extractToolMentions,
} from '../lib/tool-refs.mjs';

const fence = (lang, body) => `\`\`\`${lang}\n${body}\n\`\`\``;

describe('extractJsonCalls', () => {
  it('tool と args の形から、ツール名と引数名と行番号を取る', () => {
    const md = ['前置き', fence('jsonc', '// 条番号が分かっているとき\n{\n  "tool": "get_law",\n  "args": { "law_name": "消費税法", "article": "57の2" }\n}')].join('\n');
    const calls = extractJsonCalls(md);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], { tool: 'get_law', args: ['law_name', 'article'], form: 'json-tool', line: 4 });
  });

  it('1 つのブロックに複数のオブジェクトとコメントがあっても、それぞれ取る', () => {
    const body = '{ "tool": "get_toc", "args": { "law_name": "民法", "depth": 2 } }\n// → 目次\n{ "tool": "search_law", "args": { "keyword": "https://example.com/a//b" } }';
    const calls = extractJsonCalls(fence('json', body));
    assert.deepEqual(
      calls.map((c) => [c.tool, c.args]),
      [
        ['get_toc', ['law_name', 'depth']],
        ['search_law', ['keyword']],
      ],
    );
  });

  it('delegate_to_mcp の example は mcp のツールとして扱い、mcp と tool を引数に数えない', () => {
    const body = '{ "action": "delegate_to_mcp", "example": { "mcp": "houki-egov", "tool": "get_law", "law_name": "消費税法", "item": 8 } }';
    const [call] = extractJsonCalls(fence('jsonc', body));
    assert.equal(call.tool, 'get_law');
    assert.equal(call.mcp, 'houki-egov');
    assert.deepEqual(call.args, ['law_name', 'item']);
  });

  it('action がツール名なら example の引数をそのツールの引数として取る', () => {
    const body = '{ "action": "nta_get_tsutatsu", "example": { "name": "消費税法基本通達", "clause": "5-1-1" } }';
    const [call] = extractJsonCalls(fence('json', body));
    assert.deepEqual([call.tool, call.args, call.form], ['nta_get_tsutatsu', ['name', 'clause'], 'json-action']);
  });

  it('ツールではない action（list_tools など）は呼び出しとして扱わない', () => {
    const body = '{ "action": "list_tools", "example": { "x": 1 } }';
    assert.deepEqual(extractJsonCalls(fence('json', body)), []);
  });

  it('mermaid のブロックと、JSON として読めないブロックは見ない', () => {
    const md = [fence('mermaid', 'A["{ \\"tool\\": \\"x\\", \\"args\\": {} }"]'), fence('ts', 'const a = { tool: "get_law", args: {} };')].join('\n');
    assert.deepEqual(extractJsonCalls(md), []);
  });
});

describe('extractInlineCalls', () => {
  it('本文の `ツール名 { … }` から引数名を取る（引用符あり・なし・値なし）', () => {
    const md = [
      '`search_law { "keyword": "<語>", "law_type": "Act" }` で探す',
      '`get_attachment { "law_name", "src": "<attachments[].src>", "save": true }`',
      '  rt["read_text { file_path, split_columns: 2 }"]',
    ].join('\n');
    const calls = extractInlineCalls(md);
    assert.deepEqual(
      calls.map((c) => [c.tool, c.args, c.line]),
      [
        ['search_law', ['keyword', 'law_type'], 1],
        ['get_attachment', ['law_name', 'src', 'save'], 2],
        ['read_text', ['file_path', 'split_columns'], 3],
      ],
    );
  });

  it('1 行に 2 つあればどちらも取る', () => {
    const calls = extractInlineCalls('`read_url { url }` または `read_text { file_path }`');
    assert.deepEqual(
      calls.map((c) => c.tool),
      ['read_url', 'read_text'],
    );
  });
});

describe('argNamesFromBraces', () => {
  it('入れ子の値の中のカンマで区切らない', () => {
    assert.deepEqual(argNamesFromBraces(' "a": { "x": 1, "y": 2 }, b: [1, 2], "c" '), ['a', 'b', 'c']);
  });
  it('省略の記号だけの要素は飛ばす', () => {
    assert.deepEqual(argNamesFromBraces(' a: 1, … '), ['a']);
  });
});

describe('extractToolMentions', () => {
  it('バッククォートのツール名を取り、手段の名前・フィールド名・コードブロックの中は取らない', () => {
    const md = ['`nta_get_qa` と `search_tsutatsu` と `list_tools` と `search_notes` と `read_strategy`', fence('', '`get_law`')].join('\n');
    assert.deepEqual(
      extractToolMentions(md).map((m) => m.tool),
      ['nta_get_qa', 'search_tsutatsu'],
    );
  });
});

describe('blankComments', () => {
  it('文字列の中の // は残し、改行と文字数を変えない', () => {
    const src = '{ "u": "https://x" } // c\n/* a\nb */ {}';
    const out = blankComments(src);
    assert.equal(out.length, src.length);
    assert.equal(out.split('\n').length, 3);
    assert.ok(out.includes('"https://x"'));
    assert.ok(!out.includes('// c'));
  });
});
