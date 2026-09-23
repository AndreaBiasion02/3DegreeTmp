import { tones } from '../src/lib/coaster-design.mjs';
import { generateArtworks } from './coaster-art-api.mjs';

export const API_PATH = '/api/coaster-ideas';
const MAX_BODY = 4096;
export const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });

// Pure reservation: charged attempts count too, so upstream errors cannot bypass the cap.
export function reserveQuota(previous, client, now, dailyLimit, hourlyLimit, cooldown) {
  const day = new Date(now).toISOString().slice(0, 10);
  const state = previous?.day === day ? previous : { day, count: 0, clients: {} };

  let dLimit = dailyLimit;
  let hLimit = hourlyLimit;
  let cd = cooldown;

  if (typeof dailyLimit === 'object' && dailyLimit !== null) {
    const opts = dailyLimit;
    dLimit = opts.COASTER_DAILY_LIMIT ?? opts.dailyLimit;
    hLimit = opts.COASTER_HOURLY_LIMIT ?? opts.hourlyLimit;
    cd = opts.COASTER_COOLDOWN_SECONDS ?? opts.COASTER_COOLDOWN_MS ?? opts.cooldownSeconds ?? opts.cooldownMs ?? opts.cooldown;
  }

  if (dLimit === undefined && typeof process !== 'undefined') dLimit = process.env?.COASTER_DAILY_LIMIT;
  if (hLimit === undefined && typeof process !== 'undefined') hLimit = process.env?.COASTER_HOURLY_LIMIT;
  if (cd === undefined && typeof process !== 'undefined') cd = process.env?.COASTER_COOLDOWN_SECONDS ?? process.env?.COASTER_COOLDOWN_MS;

  const limit = /^\d+$/.test(String(dLimit)) ? Math.min(Number(dLimit), 10000) : 300;
  const hourly = /^\d+$/.test(String(hLimit)) ? Math.min(Number(hLimit), 1000) : 10;

  let cooldownMs = 10000;
  if (/^\d+(?:\.\d+)?$/.test(String(cd))) {
    const num = Number(cd);
    cooldownMs = num > 1000 ? Math.min(num, 3600000) : Math.min(Math.round(num * 1000), 3600000);
  }

  if (state.count >= limit) return { allowed: false, retryAfter: Math.ceil((Date.parse(`${day}T00:00:00Z`) + 86400000 - now) / 1000), state };
  const hour = Math.floor(now / 3600000);
  const prior = state.clients[client];
  if (cooldownMs > 0 && prior && now - prior.last < cooldownMs) {
    return { allowed: false, retryAfter: Math.ceil((cooldownMs - now + prior.last) / 1000), state };
  }
  if (prior?.hour === hour && prior.count >= hourly) {
    return { allowed: false, retryAfter: Math.ceil(((hour + 1) * 3600000 - now) / 1000), state };
  }
  state.clients[client] = { hour, count: prior?.hour === hour ? prior.count + 1 : 1, last: now };
  state.count++;
  return { allowed: true, state };
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
      !Object.hasOwn(tones, input.tone) || (input.action !== undefined && input.action !== 'generate') ||
      (input.target !== undefined && !['coaster', 'cap'].includes(input.target)) ||
      (input.shape !== undefined && !['circle', 'square'].includes(input.shape)) ||
      (input.avoid !== undefined && (!Array.isArray(input.avoid) || input.avoid.length > 3 || input.avoid.some(s => typeof s !== 'string' || s.length > 100)))) throw new Error('Invalid input');
  } catch { return json({ error: 'Scrivi una descrizione da 10 a 600 caratteri e scegli il tono.' }, 400); }
  if (!env.OPENAI_API_KEY) return json({ error: 'La generazione AI non è ancora attiva. Puoi intanto preparare la descrizione del sottobicchiere.' }, 503);
  try {
    const quota = await reserve(client, env);
    if (!quota.allowed) return json({ error: 'Limite di generazione raggiunto. Riprova più tardi: le tue proposte restano disponibili.' }, 429, { 'Retry-After': String(quota.retryAfter) });
  } catch { return json({ error: 'Generazione temporaneamente non disponibile. Riprova più tardi.' }, 503); }
  return generateArtworks(input, { env, palette, fetcher });
}
