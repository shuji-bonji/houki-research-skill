/**
 * MCP サーバーを stdio で起動し、initialize と tools/list の応答を受け取る。
 *
 * houki-hub の scripts/generate-reference.mjs と同じ手順（生の JSON-RPC over stdio。MCP SDK は使わない）。
 */

import { spawn } from 'node:child_process';

const TIMEOUT_MS = 30_000;

/**
 * @param {{ command: string, args: string[], env?: Record<string, string> }} cfg
 * @returns {Promise<{ serverInfo: { name: string, version: string }, tools: Array<{ name: string, inputSchema?: object }> }>}
 */
export function listTools(cfg) {
  return new Promise((resolveList, rejectList) => {
    const p = spawn(cfg.command, cfg.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...(cfg.env ?? {}) },
    });
    let stderrTail = '';
    p.stderr.on('data', (d) => {
      stderrTail = `${stderrTail}${d}`.slice(-2000);
    });
    const timer = setTimeout(() => {
      p.kill();
      const tail = stderrTail ? `\n--- server stderr (tail) ---\n${stderrTail}` : '';
      rejectList(new Error(`tools/list の応答が ${TIMEOUT_MS / 1000} 秒以内に来ませんでした${tail}`));
    }, TIMEOUT_MS);

    let buf = '';
    const pending = new Map();
    // JSON でない行（native module の警告など）は読み飛ばす
    p.stdout.on('data', (d) => {
      buf = `${buf}${d}`;
      let i = buf.indexOf('\n');
      while (i >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 1);
        i = buf.indexOf('\n');
        if (!line.trim()) continue;
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          continue;
        }
        if (msg.id != null && pending.has(msg.id)) pending.get(msg.id)(msg);
      }
    });
    p.on('error', (e) => {
      clearTimeout(timer);
      rejectList(e);
    });

    const send = (m) => p.stdin.write(`${JSON.stringify(m)}\n`);
    const rpc = (id, method, params) =>
      new Promise((res) => {
        pending.set(id, res);
        send({ jsonrpc: '2.0', id, method, params });
      });

    (async () => {
      const init = await rpc(1, 'initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'houki-research-skill-check', version: '0.0.1' },
      });
      send({ jsonrpc: '2.0', method: 'notifications/initialized' });
      const tools = await rpc(2, 'tools/list', {});
      clearTimeout(timer);
      p.kill();
      if (init.error) throw new Error(`initialize が失敗しました: ${JSON.stringify(init.error)}`);
      if (tools.error) throw new Error(`tools/list が失敗しました: ${JSON.stringify(tools.error)}`);
      resolveList({ serverInfo: init.result.serverInfo, tools: tools.result.tools });
    })().catch((e) => {
      clearTimeout(timer);
      p.kill();
      rejectList(e);
    });
  });
}
