#!/usr/bin/env node
/**
 * update-mcp-snapshots.mjs — Skill の文書と突き合わせる MCP の情報を mcp-snapshots/ に書き出す。
 *
 * scripts/mcp-refs.config.json の各 MCP について、次の 2 つを 1 つの JSON にまとめる。
 *
 * - tools: npm から指定の版を入れて stdio で起動し、tools/list の応答からツール名と引数名を写したもの
 * - errorCodes: code の正本から読んだ code の一覧
 *   - specs/ のある MCP: GitHub のタグ v<version> の specs/current/common_errors/spec.md の「エラーの code」の表
 *   - specs/ の無い MCP（pdf-reader-mcp）: npm パッケージの型定義の union 型
 *
 * check-mcp-refs.mjs はこのファイルだけを読むので、ネットワーク無しで検査できる。
 *
 * 使い方:
 *   node scripts/update-mcp-snapshots.mjs            # 設定の版で作り直して書き込む
 *   node scripts/update-mcp-snapshots.mjs --check    # 作り直した内容がコミット済みと同じか確かめる（違えば exit 1）
 *   node scripts/update-mcp-snapshots.mjs --latest   # npm の latest で作り直す（設定の版は書き換えない）
 *   node scripts/update-mcp-snapshots.mjs houki-nta  # 1 つだけ
 *
 * 手元の作業コピーを使うとき（dist をビルド済みで、specs/ があること）:
 *   HOUKI_MCP_LOCAL_houki_nta=/path/to/houki-nta-mcp node scripts/update-mcp-snapshots.mjs houki-nta
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDtsUnion, parseSpecErrorCodes } from './lib/error-codes.mjs';
import { listTools } from './lib/mcp-client.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = JSON.parse(readFileSync(join(ROOT, 'scripts/mcp-refs.config.json'), 'utf8'));
const OUT_DIR = join(ROOT, 'mcp-snapshots');

const argv = process.argv.slice(2);
const CHECK = argv.includes('--check');
const LATEST = argv.includes('--latest');
const only = argv.filter((a) => !a.startsWith('--'));

function npmLatest(pkg) {
  return execFileSync('npm', ['view', pkg, 'version'], { encoding: 'utf8' }).trim();
}

/** npm パッケージを一時ディレクトリに入れ、パッケージのディレクトリを返す。 */
function installPackage(pkg, version, workDir) {
  writeFileSync(join(workDir, 'package.json'), JSON.stringify({ name: 'mcp-snapshot-work', private: true }));
  execFileSync('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error', `${pkg}@${version}`], {
    cwd: workDir,
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  return join(workDir, 'node_modules', pkg);
}

function binPath(pkgDir) {
  const pkgJson = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
  const bin = typeof pkgJson.bin === 'string' ? pkgJson.bin : Object.values(pkgJson.bin ?? {})[0];
  if (!bin) throw new Error(`${pkgJson.name} の package.json に bin がありません`);
  return join(pkgDir, bin);
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} を取得できませんでした（HTTP ${res.status}）`);
  return res.text();
}

/** tools/list の応答から、検査に使う部分（ツール名・引数名・必須・inputSchema に無い引数を受け付けるか）だけを残す。 */
function summarizeTools(tools) {
  return tools
    .map((t) => {
      const schema = t.inputSchema ?? {};
      return {
        name: t.name,
        properties: Object.keys(schema.properties ?? {}).sort(),
        required: [...(schema.required ?? [])].sort(),
        acceptsUnknownArgs: schema.additionalProperties !== false,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function build(server) {
  const localDir = process.env[`HOUKI_MCP_LOCAL_${server.name.replace(/-/g, '_')}`];
  const version = LATEST ? npmLatest(server.npm) : server.version;
  let pkgDir = localDir;
  let workDir = null;
  if (!pkgDir) {
    workDir = mkdtempSync(join(tmpdir(), `mcp-${server.name}-`));
    pkgDir = installPackage(server.npm, version, workDir);
  }
  try {
    const { serverInfo, tools } = await listTools({ command: process.execPath, args: [binPath(pkgDir)] });

    let errorCodes;
    let errorCodesSource;
    if (server.errorCodes?.spec) {
      if (localDir) {
        errorCodesSource = `${server.repo}（作業コピー）/${server.errorCodes.spec}`;
        errorCodes = parseSpecErrorCodes(readFileSync(join(localDir, server.errorCodes.spec), 'utf8'));
      } else {
        errorCodesSource = `https://github.com/${server.repo}/blob/v${version}/${server.errorCodes.spec}`;
        const raw = `https://raw.githubusercontent.com/${server.repo}/v${version}/${server.errorCodes.spec}`;
        errorCodes = parseSpecErrorCodes(await fetchText(raw));
      }
    } else if (server.errorCodes?.dts) {
      errorCodesSource = `${server.npm}@${version} の ${server.errorCodes.dts}（${server.errorCodes.type}）`;
      errorCodes = parseDtsUnion(readFileSync(join(pkgDir, server.errorCodes.dts), 'utf8'), server.errorCodes.type);
    }

    return {
      $comment: '自動生成（scripts/update-mcp-snapshots.mjs）。手で編集しないでください',
      server: server.name,
      npm: server.npm,
      version: serverInfo?.version ?? version,
      tools: summarizeTools(tools),
      errorCodesSource,
      errorCodes: [...(errorCodes ?? [])].sort(),
    };
  } finally {
    if (workDir) rmSync(workDir, { recursive: true, force: true });
  }
}

const targets = CONFIG.servers.filter((s) => only.length === 0 || only.includes(s.name));
if (targets.length === 0) {
  console.error(`対象の MCP がありません: ${only.join(', ')}`);
  process.exit(2);
}

mkdirSync(OUT_DIR, { recursive: true });
let differs = 0;
for (const server of targets) {
  const snap = await build(server);
  const text = `${JSON.stringify(snap, null, 2)}\n`;
  const outPath = join(OUT_DIR, `${server.name}.json`);
  if (CHECK) {
    const before = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
    if (before === text) {
      console.log(`ok   ${server.name} v${snap.version}（ツール ${snap.tools.length}・code ${snap.errorCodes.length}）`);
    } else {
      differs++;
      console.log(`diff ${server.name} v${snap.version}: mcp-snapshots/${server.name}.json が実物と違います`);
      if (process.env.GITHUB_ACTIONS) {
        console.log(`::error file=mcp-snapshots/${server.name}.json::${server.npm}@${snap.version} から作り直した内容と違います。node scripts/update-mcp-snapshots.mjs で作り直してください`);
      }
    }
  } else {
    writeFileSync(outPath, text);
    console.log(`wrote mcp-snapshots/${server.name}.json（v${snap.version}、ツール ${snap.tools.length}・code ${snap.errorCodes.length}）`);
  }
}
if (CHECK && differs > 0) process.exit(1);
