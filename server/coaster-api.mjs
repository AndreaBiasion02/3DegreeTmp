import { generateArtworks } from './coaster-art-api.mjs';
import { getCoasterCategory } from '../src/lib/coaster-categories.mjs';

export const API_PATH = '/api/coaster-ideas';
export const STATUS_PATH = `${API_PATH}/status`;
const MAX_BODY = 4096;
export const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });

// Pure reservation: charged attempts count too, so upstream errors cannot bypass the cap.
export function reserveQuota(previous, client, now, dailyLimit, hourlyLimit, cooldown, minutelyLimit) {
  const day = new Date(now).toISOString().slice(0, 10);
  const state = previous?.day === day ? previous : { day, count: 0, clients: {} };

  let dLimit = dailyLimit;
  let hLimit = hourlyLimit;
  let cd = cooldown;
  let mLimit = minutelyLimit;

  if (typeof dailyLimit === 'object' && dailyLimit !== null) {
    const opts = dailyLimit;
    dLimit = opts.COASTER_DAILY_LIMIT ?? opts.dailyLimit;
    hLimit = opts.COASTER_HOURLY_LIMIT ?? opts.hourlyLimit;
    mLimit = opts.COASTER_MINUTELY_LIMIT ?? opts.minutelyLimit;
    cd = opts.COASTER_COOLDOWN_SECONDS ?? opts.COASTER_COOLDOWN_MS ?? opts.cooldownSeconds ?? opts.cooldownMs ?? opts.cooldown;
  }

  if (dLimit === undefined && typeof process !== 'undefined') dLimit = process.env?.COASTER_DAILY_LIMIT;
  if (hLimit === undefined && typeof process !== 'undefined') hLimit = process.env?.COASTER_HOURLY_LIMIT;
  if (mLimit === undefined && typeof process !== 'undefined') mLimit = process.env?.COASTER_MINUTELY_LIMIT;
  if (cd === undefined && typeof process !== 'undefined') cd = process.env?.COASTER_COOLDOWN_SECONDS ?? process.env?.COASTER_COOLDOWN_MS;

  const limit = /^\d+$/.test(String(dLimit)) ? Math.min(Number(dLimit), 10000) : 300;
  const hourly = /^\d+$/.test(String(hLimit)) ? Math.min(Number(hLimit), 1000) : 10;
  const minutely = /^\d+$/.test(String(mLimit)) ? Math.min(Number(mLimit), 1000) : 3;

  let cooldownMs = 10000;
  if (/^\d+(?:\.\d+)?$/.test(String(cd))) {
    const num = Number(cd);
    cooldownMs = num > 1000 ? Math.min(num, 3600000) : Math.min(Math.round(num * 1000), 3600000);
  }

  if (state.count >= limit) return { allowed: false, retryAfter: Math.ceil((Date.parse(`${day}T00:00:00Z`) + 86400000 - now) / 1000), state };
  const hour = Math.floor(now / 3600000);
  const prior = state.clients[client];
  const recent = (prior?.recent || (prior?.last ? [prior.last] : [])).filter(time => time > now - 60000 && time <= now);
  const cooldownWait = cooldownMs > 0 && prior ? Math.max(0, prior.last + cooldownMs - now) : 0;
  const minuteWait = minutely > 0 && recent.length >= minutely ? Math.max(0, recent[0] + 60000 - now) : 0;
  const hourWait = prior?.hour === hour && prior.count >= hourly ? (hour + 1) * 3600000 - now : 0;
  const wait = Math.max(cooldownWait, minuteWait, hourWait);
  if (wait > 0) return { allowed: false, retryAfter: Math.ceil(wait / 1000), state };
  const updated = { hour, count: prior?.hour === hour ? prior.count + 1 : 1, last: now, recent: [...recent, now] };
  state.clients[client] = updated;
  state.count++;
  const dailyWait = state.count >= limit ? Date.parse(`${day}T00:00:00Z`) + 86400000 - now : 0;
  const nextMinuteWait = minutely > 0 && updated.recent.length >= minutely ? updated.recent[0] + 60000 - now : 0;
  const nextHourWait = updated.count >= hourly ? (hour + 1) * 3600000 - now : 0;
  return { allowed: true, state, nextAvailableAt: now + Math.max(dailyWait, cooldownMs, nextMinuteWait, nextHourWait) };
}

export function checkQuota(previous, client, now, limits) {
  const result = reserveQuota(previous ? structuredClone(previous) : undefined, client, now, limits);
  return { allowed: result.allowed, retryAfter: result.allowed ? 0 : result.retryAfter };
}

async function readBody(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Empty body');
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) { await reader.cancel(); throw new Error('Too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function handleCoasterRequest(request, { env, palette, client, reserve, fetcher = fetch }) {
  if (request.method !== 'POST') return json({ error: 'Metodo non consentito.' }, 405, { Allow: 'POST' });
  const origin = request.headers.get('origin');
  const expected = env.COASTER_ALLOWED_ORIGIN || new URL(request.url).origin;
  if ((origin && origin !== expected) || request.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'Richiesta non consentita.' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Formato non valido.' }, 415);
  let input;
  try {
    input = await readBody(request);
    if (!input || typeof input.brief !== 'string' || input.brief.trim().length < 10 || input.brief.length > 600 ||
      (input.action !== undefined && input.action !== 'generate') ||
      (input.category !== undefined && !getCoasterCategory(input.category)) ||
      (input.colorMode !== undefined && !['mono', 'duotone'].includes(input.colorMode)) ||
      (input.target !== undefined && !['coaster', 'cap'].includes(input.target)) ||
      (input.shape !== undefined && !['circle', 'square'].includes(input.shape))) throw new Error('Invalid input');
  } catch { return json({ error: 'Scrivi una descrizione da 10 a 600 caratteri.' }, 400); }
  if (!env.OPENAI_API_KEY) return json({ error: 'La generazione AI non è ancora attiva. Puoi intanto preparare la descrizione del sottobicchiere.' }, 503);
  let quota;
  try {
    quota = await reserve(client, env);
    if (!quota.allowed) return json({ error: 'Limite di generazione raggiunto. Riprova più tardi: le tue proposte restano disponibili.' }, 429, { 'Retry-After': String(quota.retryAfter) });
  } catch { return json({ error: 'Generazione temporaneamente non disponibile. Riprova più tardi.' }, 503); }
  const result = await generateArtworks(input, { env, palette, fetcher });
  if (quota.nextAvailableAt > Date.now()) {
    result.headers.set('X-Generation-Retry-After', String(Math.ceil((quota.nextAvailableAt - Date.now()) / 1000)));
  }
  return result;
}

export async function handleQuotaStatusRequest(request, { env, client, check }) {
  if (request.method !== 'GET') return json({ error: 'Metodo non consentito.' }, 405, { Allow: 'GET' });
  const origin = request.headers.get('origin');
  const expected = env.COASTER_ALLOWED_ORIGIN || new URL(request.url).origin;
  if ((origin && origin !== expected) || request.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'Richiesta non consentita.' }, 403);
  try {
    return json(await check(client, env));
  } catch {
    return json({ error: 'Stato del limite temporaneamente non disponibile.' }, 503);
  }
}
