import palette from '../src/lib/filament-palette.json';
import { API_PATH, handleCoasterRequest, reserveQuota } from './coaster-api.mjs';

export class CoasterQuota {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  async fetch(request) {
    const { client } = await request.json();
    const result = await this.ctx.storage.transaction(async storage => {
      const cooldown = this.env.COASTER_COOLDOWN_SECONDS ?? this.env.COASTER_COOLDOWN_MS;
      const reservation = reserveQuota(await storage.get('quota'), client, Date.now(), this.env.COASTER_DAILY_LIMIT, this.env.COASTER_HOURLY_LIMIT, cooldown);
      if (reservation.allowed) await storage.put('quota', reservation.state);
      return { allowed: reservation.allowed, retryAfter: reservation.retryAfter };
    });
    return Response.json(result);
  }
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.replace(/\/$/, '') !== API_PATH) return env.ASSETS.fetch(request);
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(request.headers.get('CF-Connecting-IP') || 'unknown'));
    const client = Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
    return handleCoasterRequest(request, { env, palette, client, reserve: async key => {
      const quota = env.COASTER_QUOTA.get(env.COASTER_QUOTA.idFromName('global'));
      const response = await quota.fetch('https://quota/reserve', { method: 'POST', body: JSON.stringify({ client: key }) });
      if (!response.ok) throw new Error('Quota unavailable');
      return response.json();
    } });
  },
};
