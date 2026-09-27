/**
 * Skill の文書に書かれたツールの呼び出し例から、ツール名と引数名を取り出す。
 *
 * 取り出す形は 3 通り。
 *
 * 1. コードブロックの JSON（jsonc のコメント可）
 *    - `{ "tool": "get_law", "args": { "law_name": "…" } }` → get_law の引数 law_name
 *    - `{ "action": "nta_get_tsutatsu", "example": { "name": "…" } }` → nta_get_tsutatsu の引数 name
 *    - `{ "action": "delegate_to_mcp", "example": { "mcp": "houki-egov", "tool": "get_law", "law_name": "…" } }`
 *      → houki-egov の get_law の引数 law_name（`mcp` と `tool` は引数ではないので除く）
 * 2. 本文・図の中の `ツール名 { 引数 }` の形
 *    - `search_law { "keyword": "…" }`、`read_text { file_path, split_columns: 2 }`、
 *      `get_attachment { "law_name", "src": "…" }` など。値は見ず、引数名だけを取る
 * 3. バッククォートで囲んだツール名（`nta_get_qa` など）。引数は無い
 */

/** next_actions の action に入る、ツールではない手段の名前。 */
export const NON_TOOL_ACTIONS = new Set([
  'delegate_to_mcp',
  'list_tools',
  'retry_later',
  'cli_bulk_download',
  'visit_egov_site',
  'bulk_download_everything',
]);

/** example の中でツールの引数ではないキー。 */
const NON_ARG_KEYS = new Set(['mcp', 'tool']);

/**
 * `//` と `/* *\/` のコメントを空白に置き換える（文字列の中は残す）。改行と文字数は変えない。
 */
export function blankComments(src) {
  let out = '';
  let i = 0;
  let inStr = false;
  while (i < src.length) {
    const c = src[i];
    if (inStr) {
      out = `${out}${c}`;
      if (c === '\\' && i + 1 < src.length) {
        out = `${out}${src[i + 1]}`;
        i += 2;
        continue;
      }
      if (c === '"') inStr = false;
      i++;
      continue;
    }
    if (c === '"') {
      inStr = true;
      out = `${out}${c}`;
      i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') {
        out = `${out} `;
        i++;
      }
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        out = `${out}${src[i] === '\n' ? '\n' : ' '}`;
        i++;
      }
      out = `${out}  `;
      i += 2;
      continue;
    }
    out = `${out}${c}`;
    i++;
  }
  return out;
}

/**
 * `start` の位置の `{` に対応する `}` までを返す。文字列の中の括弧は数えない。対応が無ければ null。
 * @param {boolean} [quoted] true なら `"…"` を文字列として扱う
 */
export function balancedAt(src, start, quoted = true) {
  let depth = 0;
  let inStr = false;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === '\\') i++;
      else if (c === '"') inStr = false;
      continue;
    }
    if (quoted && c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

/** Markdown のコードブロックを返す（言語名と、本文の 1 行目の行番号）。 */
export function codeBlocks(text) {
  const lines = text.split('\n');
  const blocks = [];
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*(```+|~~~+)\s*([\w-]*)/);
    if (m) {
      if (!cur) {
        cur = { fence: m[1], lang: m[2].toLowerCase(), startLine: i + 2, body: [] };
        continue;
      }
      if (lines[i].trim().startsWith(cur.fence)) {
        blocks.push({ lang: cur.lang, startLine: cur.startLine, text: cur.body.join('\n') });
        cur = null;
        continue;
      }
    }
    if (cur) cur.body.push(lines[i]);
  }
  return blocks;
}

function lineAt(src, index, startLine) {
  let n = 0;
  for (let i = 0; i < index; i++) if (src[i] === '\n') n++;
  return startLine + n;
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * JSON のオブジェクト 1 つから呼び出しを取り出す。当てはまらなければ null。
 * @returns {{ tool: string, args: string[], mcp?: string, form: string } | null}
 */
export function callFromObject(obj) {
  if (!isPlainObject(obj)) return null;
  if (typeof obj.tool === 'string' && isPlainObject(obj.args)) {
    return { tool: obj.tool, args: Object.keys(obj.args), form: 'json-tool' };
  }
  if (typeof obj.action === 'string' && isPlainObject(obj.example)) {
    const ex = obj.example;
    const args = Object.keys(ex).filter((k) => !NON_ARG_KEYS.has(k));
    if (obj.action === 'delegate_to_mcp') {
      if (typeof ex.tool !== 'string') return null;
      return { tool: ex.tool, args, mcp: typeof ex.mcp === 'string' ? ex.mcp : undefined, form: 'json-delegate' };
    }
    if (NON_TOOL_ACTIONS.has(obj.action)) return null;
    return { tool: obj.action, args, form: 'json-action' };
  }
  return null;
}

/**
 * コードブロックの JSON から呼び出しを取り出す（mermaid のブロックは見ない）。
 * @returns {Array<{ tool: string, args: string[], mcp?: string, form: string, line: number }>}
 */
export function extractJsonCalls(text) {
  const out = [];
  for (const block of codeBlocks(text)) {
    if (block.lang === 'mermaid') continue;
    const src = blankComments(block.text);
    for (let i = 0; i < src.length; i++) {
      if (src[i] !== '{') continue;
      const objSrc = balancedAt(src, i);
      if (!objSrc) continue;
      let obj;
      try {
        obj = JSON.parse(objSrc);
      } catch {
        continue;
      }
      const call = callFromObject(obj);
      if (call) out.push({ ...call, line: lineAt(src, i, block.startLine) });
    }
  }
  return out;
}

/**
 * `{ … }` の中身から引数名を取り出す。`"key": 値`・`key: 値`・`"key"`・`key` の 4 通りを認める。
 * `…` や `...` だけの要素は飛ばす。
 */
export function argNamesFromBraces(inner) {
  const parts = [];
  let depth = 0;
  let inStr = false;
  let cur = '';
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (inStr) {
      cur = `${cur}${c}`;
      if (c === '\\') {
        cur = `${cur}${inner[i + 1] ?? ''}`;
        i++;
      } else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    if (c === '{' || c === '[' || c === '(') depth++;
    if (c === '}' || c === ']' || c === ')') depth--;
    if (c === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
      continue;
    }
    cur = `${cur}${c}`;
  }
  parts.push(cur);
  const names = [];
  for (const raw of parts) {
    const p = raw.trim();
    if (p === '' || /^(…|\.\.\.)$/.test(p)) continue;
    const m = p.match(/^["']?([A-Za-z_][A-Za-z0-9_]*)["']?\s*(?::|$)/);
    if (m) names.push(m[1]);
  }
  return names;
}

/**
 * 本文と図の中の `ツール名 { 引数 }` を取り出す（行ごと。括弧は同じ行で閉じるものだけ）。
 * @returns {Array<{ tool: string, args: string[], form: string, line: number }>}
 */
export function extractInlineCalls(text) {
  const out = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const m of line.matchAll(/(?<![\w.$])([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\s*\{/g)) {
      const braceAt = m.index + m[0].length - 1;
      // `"…"` の中に引数名以外の `"` があるとずれるので、ここでは文字列を意識しない数え方にする
      const body = balancedAt(line, braceAt, false);
      if (!body) continue;
      out.push({ tool: m[1], args: argNamesFromBraces(body.slice(1, -1)), form: 'inline', line: i + 1 });
    }
  }
  return out;
}

/** ツール名の形をしているが、応答のフィールド名であるもの。 */
export const FIELD_NAMES = new Set(['search_notes']);

/** バッククォートで囲んだ語のうち、ツール名として扱う形。 */
const TOOL_MENTION = /^(?:nta_[a-z0-9_]+|(?:search|get|list|resolve|explain|verify)_[a-z0-9_]+)$/;

/**
 * バッククォートで囲んだツール名（引数なし）を取り出す。
 * @returns {Array<{ tool: string, line: number }>}
 */
export function extractToolMentions(text) {
  const out = [];
  const lines = text.split('\n');
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    for (const m of lines[i].matchAll(/`([^`\s]+)`/g)) {
      const name = m[1];
      if (TOOL_MENTION.test(name) && !NON_TOOL_ACTIONS.has(name) && !FIELD_NAMES.has(name)) out.push({ tool: name, line: i + 1 });
    }
  }
  return out;
}
