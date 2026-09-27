import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractCodeMentions,
  looksLikeErrorCode,
  parseDtsUnion,
  parseErrorCodesDoc,
  parseSpecErrorCodes,
} from '../lib/error-codes.mjs';

describe('parseSpecErrorCodes', () => {
  const spec = [
    '## 対象',
    '### エラー応答のフィールド',
    '| フィールド | 内容 |',
    '| --- | --- |',
    '| `error` | 説明 |',
    '',
    '### エラーの code',
    '',
    'どの場面でどの code を返すかは各ツールの spec.md に書く。',
    '',
    '| code | 失敗の種類 |',
    '| ---- | ---------- |',
    '| `INVALID_ARGUMENT` | 引数の誤り |',
    '| `SOURCE_TIMEOUT` / `SOURCE_RATE_LIMITED` | 時間切れ / 回数制限 |',
    '| `INTERNAL_ERROR` | 内部の失敗 |',
    '',
    '## 処理の流れ',
    '| `NOT_A_CODE_TABLE` | x |',
  ].join('\n');

  it('「エラーの code」の表の 1 列目から、1 つのセルに複数あるものも含めて取る', () => {
    assert.deepEqual(parseSpecErrorCodes(spec), ['INVALID_ARGUMENT', 'SOURCE_TIMEOUT', 'SOURCE_RATE_LIMITED', 'INTERNAL_ERROR']);
  });

  it('見出しが無ければ例外にする', () => {
    assert.throws(() => parseSpecErrorCodes('# 何もない'), /エラーの code/);
  });
});

describe('parseDtsUnion', () => {
  it('union 型の文字列リテラルを取る', () => {
    const dts = "export type LawErrorCode = 'INVALID_ARGUMENT' | 'DOC_NOT_FOUND'\n  | 'FILE_TOO_LARGE';";
    assert.deepEqual(parseDtsUnion(dts, 'LawErrorCode'), ['INVALID_ARGUMENT', 'DOC_NOT_FOUND', 'FILE_TOO_LARGE']);
  });
  it('型が無ければ例外にする', () => {
    assert.throws(() => parseDtsUnion('export type Other = "A_B";', 'LawErrorCode'), /LawErrorCode/);
  });
});

describe('parseErrorCodesDoc', () => {
  const doc = [
    '| MCP | 正本 |',
    '| --- | --- |',
    '| houki-egov-mcp | x |',
    '',
    '| code | 意味 | houki-egov-mcp | houki-nta-mcp | pdf-reader-mcp |',
    '| --- | --- | --- | --- | --- |',
    '| `INVALID_ARGUMENT` | 引数 | ○ | ○ | ○ |',
    '| `LAW_NOT_FOUND` | 法令 | ○ | | |',
    '| `FILE_TOO_LARGE` | 大きい | | | ○ |',
    '| `ORPHAN_ERROR` | 誰も返さない | | | |',
  ].join('\n');
  const cols = ['houki-egov-mcp', 'houki-nta-mcp', 'pdf-reader-mcp'];

  it('1 列目が code の表だけを読み、印のある MCP の列を返す', () => {
    const rows = parseErrorCodesDoc(doc, cols);
    assert.deepEqual(
      rows.map((r) => [r.code, r.columns, r.line]),
      [
        ['INVALID_ARGUMENT', cols, 7],
        ['LAW_NOT_FOUND', ['houki-egov-mcp'], 8],
        ['FILE_TOO_LARGE', ['pdf-reader-mcp'], 9],
        ['ORPHAN_ERROR', [], 10],
      ],
    );
  });
});

describe('extractCodeMentions', () => {
  it('code の形の語だけを拾い、環境変数とワイルドカードは拾わない', () => {
    const text = [
      '`code: ARTICLE_NOT_FOUND` を確認し、`HOUKI_NTA_DB_PATH` を見る',
      '`SOURCE_*` と `*_NOT_FOUND` と UNSUPPORTED_*_FEATURE はまとめた書き方',
      '`INVALID_PDF` / `FILE_TOO_LARGE`',
    ].join('\n');
    assert.deepEqual(
      extractCodeMentions(text).map((m) => [m.code, m.line]),
      [
        ['ARTICLE_NOT_FOUND', 1],
        ['INVALID_PDF', 3],
        ['FILE_TOO_LARGE', 3],
      ],
    );
  });

  it('looksLikeErrorCode は末尾で code と環境変数を分ける', () => {
    assert.equal(looksLikeErrorCode('SOURCE_RATE_LIMITED'), true);
    assert.equal(looksLikeErrorCode('XDG_CACHE_HOME'), false);
  });
});
