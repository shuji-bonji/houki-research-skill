/**
 * エラーの code を読み取る関数。
 *
 * - 各 MCP の正本（specs/current/common_errors/spec.md の「エラーの code」の表、
 *   または specs/ の無い MCP では型定義の union 型）から code の一覧を取る
 * - Skill の docs/ERROR-CODES.md の表から、code ごとにどの MCP が返すかを取る
 * - Skill の文書の本文から、code に見える語（`ARTICLE_NOT_FOUND` など）を拾う
 */

/** 表の 1 行をセルに分ける。先頭と末尾の `|` は除く。 */
export function splitRow(line) {
  const t = line.trim();
  if (!t.startsWith('|')) return null;
  const inner = t.replace(/^\|/, '').replace(/\|$/, '');
  return inner.split('|').map((c) => c.trim());
}

function isSeparatorRow(cells) {
  return cells.every((c) => /^:?-{3,}:?$/.test(c));
}

/** セルの中のバッククォートで囲まれた語をすべて返す。 */
export function backticked(cell) {
  return [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}

/**
 * spec.md の `### エラーの code` の節にある表の 1 列目から code を取る。
 * 1 つのセルに `SOURCE_TIMEOUT` / `SOURCE_RATE_LIMITED` のように複数並ぶ場合もすべて取る。
 * @param {string} text
 * @returns {string[]} 出てきた順・重複なし
 */
export function parseSpecErrorCodes(text) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /^###\s+エラーの\s*code\s*$/.test(l.trim()));
  if (start < 0) throw new Error('spec.md に「### エラーの code」の見出しがありません');
  const codes = [];
  let inTable = false;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^#{1,3}\s/.test(line)) break;
    const cells = splitRow(line);
    if (!cells) {
      if (inTable) break;
      continue;
    }
    if (!inTable) {
      inTable = true; // 見出し行
      continue;
    }
    if (isSeparatorRow(cells)) continue;
    for (const code of backticked(cells[0])) {
      if (isCodeLike(code) && !codes.includes(code)) codes.push(code);
    }
  }
  if (codes.length === 0) throw new Error('「### エラーの code」の表から code を 1 つも読めませんでした');
  return codes;
}

/**
 * 型定義の `export type <name> = 'A' | 'B';` から文字列リテラルを取る。
 * @param {string} text .d.ts の本文
 * @param {string} typeName
 */
export function parseDtsUnion(text, typeName) {
  const re = new RegExp(`export\\s+(?:declare\\s+)?type\\s+${typeName}\\s*=([^;]+);`);
  const m = text.match(re);
  if (!m) throw new Error(`型定義に ${typeName} がありません`);
  const codes = [...m[1].matchAll(/'([^']+)'|"([^"]+)"/g)].map((x) => x[1] ?? x[2]);
  if (codes.length === 0) throw new Error(`${typeName} から文字列リテラルを読めませんでした`);
  return [...new Set(codes)];
}

/** code の形（大文字・数字・アンダースコアで、アンダースコアを 1 つ以上含む）。 */
export function isCodeLike(s) {
  return /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/.test(s);
}

/**
 * 文書の本文で code として扱う語の末尾。環境変数（`HOUKI_NTA_DB_PATH` など）と区別するために使う。
 */
const CODE_SUFFIXES = [
  '_NOT_FOUND',
  '_ERROR',
  '_ARGUMENT',
  '_TOOL',
  '_SCOPE',
  '_TIMEOUT',
  '_RATE_LIMITED',
  '_UNAVAILABLE',
  '_NUM',
  '_PDF',
  '_FEATURE',
  '_TOO_LARGE',
];

export function looksLikeErrorCode(s) {
  return isCodeLike(s) && CODE_SUFFIXES.some((suf) => s.endsWith(suf));
}

/**
 * 文書の本文から code に見える語を拾う（行番号付き）。`*_NOT_FOUND` のようなワイルドカードは拾わない。
 * @param {string} text
 * @returns {Array<{ code: string, line: number }>}
 */
export function extractCodeMentions(text) {
  const out = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(/(?<![A-Za-z0-9_*])([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)(?![A-Za-z0-9_*])/g)) {
      if (looksLikeErrorCode(m[1])) out.push({ code: m[1], line: i + 1 });
    }
  }
  return out;
}

/**
 * docs/ERROR-CODES.md の表を読む。
 * 1 列目が `code` で、見出しに MCP のパッケージ名（例: `houki-egov-mcp`）の列を持つ表を対象にする。
 * MCP の列のセルが空でなければ、その MCP が返す code とみなす。
 * @param {string} text
 * @param {string[]} columns 見出しとして探す MCP の列名
 * @returns {Array<{ code: string, line: number, columns: string[] }>}
 */
export function parseErrorCodesDoc(text, columns) {
  const lines = text.split('\n');
  const rows = [];
  let header = null;
  for (let i = 0; i < lines.length; i++) {
    const cells = splitRow(lines[i]);
    if (!cells) {
      header = null;
      continue;
    }
    if (!header) {
      const first = cells[0].replace(/`/g, '').trim();
      header = first === 'code' ? cells.map((c) => c.replace(/`/g, '').trim()) : [];
      continue;
    }
    if (header.length === 0 || isSeparatorRow(cells)) continue;
    const codes = backticked(cells[0]).filter(isCodeLike);
    if (codes.length === 0) continue;
    const marked = columns.filter((col) => {
      const idx = header.indexOf(col);
      return idx >= 0 && (cells[idx] ?? '').length > 0;
    });
    for (const code of codes) rows.push({ code, line: i + 1, columns: marked });
  }
  return rows;
}
