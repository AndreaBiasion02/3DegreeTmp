import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { API_PATH, STATUS_PATH, checkQuota, handleCoasterRequest, handleQuotaStatusRequest, reserveQuota } from './coaster-api.mjs';

// Load only local server configuration; never expose it via NEXT_PUBLIC variables.
for (const file of ['.env.local', '.env']) {
  try { process.loadEnvFile(file); } catch (e) { if (e.code !== 'ENOENT') throw e; }
}
const palette = JSON.parse(await fs.readFile(new URL('../src/lib/filament-palette.json', import.meta.url), 'utf8'));
const quotaFile = new URL('../.local/coaster-quota.json', import.meta.url);
let queue = Promise.resolve();
function reserve(client, env = process.env) {
  const job = queue.then(async () => {
    let state;
    try { state = JSON.parse(await fs.readFile(quotaFile, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    const targetEnv = env || process.env;
    const result = reserveQuota(state, client, Date.now(), targetEnv);
    if (result.allowed) {
      await fs.mkdir(new URL('../.local/', import.meta.url), { recursive: true });
      const temporary = new URL('../.local/coaster-quota.tmp', import.meta.url);
      await fs.writeFile(temporary, JSON.stringify(result.state));
      await fs.rename(temporary, quotaFile);
    }
    return result;
  });
  queue = job.catch(() => {});
  return job;
}

async function check(client, env = process.env) {
  await queue;
  let state;
  try { state = JSON.parse(await fs.readFile(quotaFile, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  return checkQuota(state, client, Date.now(), env);
}

export async function serveCoasterApi(req, res) {
  const path = req.url?.split('?')[0].replace(/\/$/, '');
  if (path !== API_PATH && path !== STATUS_PATH) return false;
  try {
    const origin = process.env.COASTER_ALLOWED_ORIGIN || `http://${req.headers.host}`;
    const request = new Request(new URL(req.url, origin), { method: req.method, headers: req.headers,
      ...(!['GET', 'HEAD'].includes(req.method) ? { body: Readable.toWeb(req), duplex: 'half' } : {}) });
    // Forwarded headers are deliberately not trusted on a public Node listener.
    const client = createHash('sha256').update(req.socket.remoteAddress || 'unknown').digest('hex');
    const response = path === STATUS_PATH
      ? await handleQuotaStatusRequest(request, { env: process.env, client, check })
      : await handleCoasterRequest(request, { env: process.env, palette, client, reserve });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(await response.text());
  } catch {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ error: 'Servizio temporaneamente non disponibile.' }));
  }
  return true;
}
