import palette from '../src/lib/filament-palette.json';
import { API_PATH, STATUS_PATH, checkQuota, handleCoasterRequest, handleQuotaStatusRequest, reserveQuota } from './coaster-api.mjs';

export class CoasterQuota {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  async fetch(request) {
    const { client } = await request.json();
    if (new URL(request.url).pathname === '/status') {
      return Response.json(checkQuota(await this.ctx.storage.get('quota'), client, Date.now(), this.env));
    }
    const result = await this.ctx.storage.transaction(async storage => {
      const reservation = reserveQuota(await storage.get('quota'), client, Date.now(), this.env);
      if (reservation.allowed) await storage.put('quota', reservation.state);
      return { allowed: reservation.allowed, retryAfter: reservation.retryAfter, nextAvailableAt: reservation.nextAvailableAt };
    });
    return Response.json(result);
  }
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname.replace(/\/$/, '');
    if (path !== API_PATH && path !== STATUS_PATH) return env.ASSETS.fetch(request);
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(request.headers.get('CF-Connecting-IP') || 'unknown'));
    const client = Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
    const quotaRequest = async (key, path) => {
      const quota = env.COASTER_QUOTA.get(env.COASTER_QUOTA.idFromName('global'));
      const response = await quota.fetch(`https://quota/${path}`, { method: 'POST', body: JSON.stringify({ client: key }) });
      if (!response.ok) throw new Error('Quota unavailable');
      return response.json();
    };
    if (path === STATUS_PATH) return handleQuotaStatusRequest(request, { env, client, check: key => quotaRequest(key, 'status') });
    return handleCoasterRequest(request, { env, palette, client, reserve: key => quotaRequest(key, 'reserve') });
  },
};
