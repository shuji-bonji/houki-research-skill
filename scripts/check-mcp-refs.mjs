#!/usr/bin/env node
/**
 * check-mcp-refs.mjs — Skill の文書が MCP の実物と食い違っていないかを確かめる。
 *
 * mcp-snapshots/*.json（update-mcp-snapshots.mjs が tools/list と code の正本から作ったもの）を基準に、
 * skills/ の下の Markdown を次の 2 つの観点で検査する。
 *
 * 1. ツール名・引数名
 *    - 呼び出し例のツール名が、どれかの MCP の tools/list にある
 *    - 呼び出し例の引数名が、そのツールの inputSchema の properties にある
 *      （delegate_to_mcp の example は `mcp` の MCP だけを見る。`mcp` と `tool` は引数に数えない）
 *    - バッククォートで囲んだツール名（`nta_get_qa` など）が、どれかの MCP の tools/list にある
 * 2. エラーの code
 *    - 各 MCP の code の正本にある code が、docs/ERROR-CODES.md の表にあり、その MCP の列に印がある
 *    - docs/ERROR-CODES.md の表で MCP の列に印のある code が、その MCP の正本にある
 *    - 文書の本文に出てくる code（`ARTICLE_NOT_FOUND` など）が、docs/ERROR-CODES.md の表にある
 *
 * 使い方:
 *   node scripts/check-mcp-refs.mjs          # 問題があれば 1 行ずつ出して exit 1
 *
 * GitHub Actions の中では、問題を ::error の注釈としても出す。
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractCodeMentions, parseErrorCodesDoc } from './lib/error-codes.mjs';
import { extractInlineCalls, extractJsonCalls, extractToolMentions } from './lib/tool-refs.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = JSON.parse(readFileSync(join(ROOT, 'scripts/mcp-refs.config.json'), 'utf8'));
const SKILL_DIR = join(ROOT, 'skills');
const ERROR_CODES_DOC = join(ROOT, 'skills/houki-research/docs/ERROR-CODES.md');

/* ---------------- 基準（スナップショット） ---------------- */

const snapshots = CONFIG.servers.map((s) => ({
  ...s,
  snap: JSON.parse(readFileSync(join(ROOT, 'mcp-snapshots', `${s.name}.json`), 'utf8')),
}));

/** ツール名 → そのツールを持つ MCP の一覧 */
const toolIndex = new Map();
for (const s of snapshots) {
  for (const t of s.snap.tools) {
    if (!toolIndex.has(t.name)) toolIndex.set(t.name, []);
    toolIndex.get(t.name).push({ server: s.name, tool: t });
  }
}

/* ---------------- 対象の文書 ---------------- */

function markdownFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...markdownFiles(p));
    else if (name.endsWith('.md')) out.push(p);
  }
  return out.sort();
}

const files = markdownFiles(SKILL_DIR).map((p) => ({ path: relative(ROOT, p), text: readFileSync(p, 'utf8') }));

/* ---------------- 問題の記録 ---------------- */

const problems = [];
function report(kind, file, line, message) {
  problems.push({ kind, file, line, message });
}

/* ---------------- 1. ツール名・引数名 ---------------- */

function checkCall(file, call) {
  let candidates = toolIndex.get(call.tool);
  if (!candidates) {
    report('tool', file, call.line, `ツール \`${call.tool}\` はどの MCP の tools/list にもありません`);
    return;
  }
  if (call.mcp) {
    const scoped = candidates.filter((c) => c.server === call.mcp);
    if (scoped.length === 0) {
      report('tool', file, call.line, `\`${call.mcp}\` の tools/list に \`${call.tool}\` がありません`);
      return;
    }
    candidates = scoped;
  }
  for (const arg of call.args) {
    const ok = candidates.some((c) => c.tool.acceptsUnknownArgs || c.tool.properties.includes(arg));
    if (!ok) {
      const where = candidates.map((c) => c.server).join(' / ');
      const known = [...new Set(candidates.flatMap((c) => c.tool.properties))].join(', ');
      report(
        'tool',
        file,
        call.line,
        `\`${call.tool}\` に引数 \`${arg}\` はありません（${where} の inputSchema の properties: ${known}）`,
      );
    }
  }
}

let callCount = 0;
let mentionCount = 0;
for (const f of files) {
  for (const call of [...extractJsonCalls(f.text), ...extractInlineCalls(f.text)]) {
    callCount++;
    checkCall(f.path, call);
  }
  for (const m of extractToolMentions(f.text)) {
    mentionCount++;
    if (!toolIndex.has(m.tool)) {
      report('tool', f.path, m.line, `\`${m.tool}\` はどの MCP の tools/list にもありません`);
    }
  }
}

/* ---------------- 2. エラーの code ---------------- */

const errorDocPath = relative(ROOT, ERROR_CODES_DOC);
const rows = parseErrorCodesDoc(
  readFileSync(ERROR_CODES_DOC, 'utf8'),
  snapshots.map((s) => s.column),
);
const rowByCode = new Map();
for (const r of rows) {
  if (rowByCode.has(r.code)) {
    report('code', errorDocPath, r.line, `\`${r.code}\` の行が 2 つあります（${rowByCode.get(r.code).line} 行目）`);
    continue;
  }
  rowByCode.set(r.code, r);
}

for (const s of snapshots) {
  const codes = new Set(s.snap.errorCodes);
  for (const code of codes) {
    const row = rowByCode.get(code);
    if (!row) {
      report('code', errorDocPath, 1, `\`${code}\` の行がありません（${s.column} の正本: ${s.snap.errorCodesSource}）`);
    } else if (!row.columns.includes(s.column)) {
      report('code', errorDocPath, row.line, `\`${code}\` の ${s.column} の列に印がありません（正本: ${s.snap.errorCodesSource}）`);
    }
  }
  for (const row of rowByCode.values()) {
    if (row.columns.includes(s.column) && !codes.has(row.code)) {
      report(
        'code',
        errorDocPath,
        row.line,
        `\`${row.code}\` の ${s.column} の列に印がありますが、${s.column} v${s.snap.version} の正本にありません（${s.snap.errorCodesSource}）`,
      );
    }
  }
}
for (const row of rowByCode.values()) {
  if (row.columns.length === 0) report('code', errorDocPath, row.line, `\`${row.code}\` はどの MCP の列にも印がありません`);
}

let codeMentionCount = 0;
for (const f of files) {
  for (const m of extractCodeMentions(f.text)) {
    codeMentionCount++;
    if (!rowByCode.has(m.code)) {
      report('code', f.path, m.line, `\`${m.code}\` は ${errorDocPath} の表にありません`);
    }
  }
}

/* ---------------- 出力 ---------------- */

const versions = snapshots.map((s) => `${s.column} v${s.snap.version}`).join(' / ');
console.log(`基準: ${versions}`);
console.log(
  `検査: 文書 ${files.length} 件、呼び出し例 ${callCount} か所、ツール名 ${mentionCount} か所、code ${codeMentionCount} か所、ERROR-CODES.md の行 ${rowByCode.size}`,
);

if (problems.length === 0) {
  console.log('問題はありません');
  process.exit(0);
}

problems.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
for (const p of problems) {
  console.log(`${p.file}:${p.line}: [${p.kind}] ${p.message}`);
  if (process.env.GITHUB_ACTIONS) {
    const msg = p.message.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    console.log(`::error file=${p.file},line=${p.line}::${msg}`);
  }
}
const byKind = (k) => problems.filter((p) => p.kind === k).length;
console.log(`問題 ${problems.length} 件（ツール名・引数名 ${byKind('tool')} 件、code ${byKind('code')} 件）`);
process.exit(1);
