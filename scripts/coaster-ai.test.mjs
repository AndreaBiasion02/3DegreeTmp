import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { handleCoasterRequest, reserveQuota } from '../server/coaster-api.mjs';
import { exampleDesign, validateDesigns, composeCoaster, diversifyLayouts, layouts } from '../src/lib/coaster-design.mjs';
import { validateArtworks } from '../src/lib/coaster-art.mjs';

const palette = JSON.parse(fs.readFileSync('src/lib/filament-palette.json', 'utf8'));
const proposals = ['Brindo alla laurea', 'Dottore in spritz', 'Tesi finita, cin cin'].map((text, i) => ({ ...exampleDesign, lines: [text], emphasis: 0, layout: ['bold', 'stamp', 'ticket'][i] }));
const artworks = ['LAUREA', 'SPRITZ', 'DOTTORE'].map((word, i) => ({ title: `Idea ${i + 1}`, concept: 'Un segno semplice e personale', background: '#218c45', foreground: '#ffffff', texts: [{ text: word, x: 50, y: 52, size: 18, maxWidth: 68, font: 'sans', anchor: 'middle', inverse: false }], paths: [{ d: 'M20 65H80', fill: false, strokeWidth: 1.5 }] }));
const request = (body = { brief: 'Giulia ama medicina e spritz', tone: 'ironico' }, headers = {}, method = 'POST') => new Request('https://example.com/api/coaster-ideas', { method, headers: { 'Content-Type': 'application/json', Origin: 'https://example.com', ...headers }, ...(method !== 'GET' ? { body: JSON.stringify(body) } : {}) });
const options = (extra = {}) => ({ env: { OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'gpt-6-luna' }, palette, client: 'hashed-client', reserve: async () => ({ allowed: true }), fetcher: async () => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ proposals: artworks }) }] }] }), ...extra });

test('Generates three validated vector artworks with bounded tokens and server-side credentials', async () => {
  let sent;
  const settings = options();
  const response = await handleCoasterRequest(request(), options({ fetcher: async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert(!url.includes('test-key'));
    assert.equal(init.headers.Authorization, 'Bearer test-key');
    sent = JSON.parse(init.body);
    assert.equal(sent.model, 'gpt-6-luna');
    assert.equal(sent.max_output_tokens, 5000);
    assert.deepEqual(sent.reasoning, { effort: 'none' });
    assert.equal(Object.hasOwn(sent, 'temperature'), false);
    assert.equal(sent.text.format.name, 'coaster_artworks');
    return settings.fetcher();
  } }));
  assert.equal(response.status, 200);
  assert.equal(sent.text.format.schema.properties.proposals.maxItems, 3);
  assert(sent.text.format.schema.properties.proposals.items.required.includes('paths'));
  assert.deepEqual((await response.json()).proposals, artworks);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('Rejects unsafe vector commands and artwork outside the printable area', () => {
  for (const patch of [{ paths: [{ d: 'M20 20<script>', fill: false, strokeWidth: 1 }] }, { texts: [{ ...artworks[0].texts[0], x: 5 }] }, { texts: [{ ...artworks[0].texts[0], y: 85 }] }, { foreground: '#123456' }]) {
    assert.throws(() => validateArtworks([{ ...artworks[0], ...patch }, ...artworks.slice(1)], palette));
  }
});

test('Uses the first complete structured response when the provider sends extra text', async () => {
  const output = `${JSON.stringify({ proposals: artworks })}\nThe assistant response must follow this JSON schema: {"type":"object"}`;
  const response = await handleCoasterRequest(request(), options({ fetcher: async () => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: output }] }] }) }));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).proposals, artworks);
});

test('Rejects invalid inputs and oversized bodies before reserving quota', async () => {
  for (const body of [null, {}, { brief: 'short', tone: 'ironico' }, { brief: 'a'.repeat(601), tone: 'ironico' }, { brief: 'a'.repeat(20), tone: 'unknown' }, { brief: 'a'.repeat(20), tone: 'ironico', avoid: ['a'.repeat(101)] }, { brief: 'a'.repeat(5000), tone: 'ironico' }]) {
    const response = await handleCoasterRequest(request(body), options({ reserve: () => { assert.fail('Must not reserve'); } }));
    assert.equal(response.status, 400);
  }
});

test('Rejects cross-origin, unsupported methods and content types', async () => {
  assert.equal((await handleCoasterRequest(request(undefined, { Origin: 'https://evil.example' }), options())).status, 403);
  assert.equal((await handleCoasterRequest(request(undefined, {}, 'GET'), options())).status, 405);
  assert.equal((await handleCoasterRequest(request(undefined, { 'Content-Type': 'text/plain' }), options())).status, 415);
});

test('Missing configuration and quota exhaustion never call OpenAI', async () => {
  const noCall = () => { assert.fail('Must not call OpenAI'); };
  assert.equal((await handleCoasterRequest(request(), options({ env: {}, fetcher: noCall }))).status, 503);
  const response = await handleCoasterRequest(request(), options({ reserve: async () => ({ allowed: false, retryAfter: 42 }), fetcher: noCall }));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '42');
  assert.equal((await handleCoasterRequest(request(), options({ reserve: async () => { throw Error('Storage failure'); }, fetcher: noCall }))).status, 503);
});

test('Provider errors are sanitized; blocked, truncated and malformed outputs fail safely', async () => {
  const cases = [Response.json({ error: 'secret provider detail' }, { status: 403 }), Response.json({ status: 'incomplete' }), Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '{bad' }] }] })];
  for (const value of cases) {
    const response = await handleCoasterRequest(request(), options({ fetcher: async () => value }));
    assert.equal(response.status, 502);
    assert(!(await response.text()).includes('secret provider detail'));
  }
  assert.equal((await handleCoasterRequest(request(), options({ fetcher: async () => { throw new DOMException('timeout', 'TimeoutError'); } }))).status, 502);
});

test('Invalid icons, palette, text, duplicate ideas and prototype keys are rejected', () => {
  for (const patch of [{ icon: 'robot' }, { icon: 'toString' }, { background: '#123456' }, { foreground: exampleDesign.background }, { lines: ['<script>'] }, { lines: ['🎓'] }, { lines: ['a'.repeat(25)] }, { lines: [] }, { layout: 'constructor' }, { emphasis: 2 }, { emphasis: -1 }, { emphasis: 0.5 }, { typography: 'constructor' }]) {
    assert.throws(() => validateDesigns([{ ...proposals[0], ...patch }, ...proposals.slice(1)], palette));
  }
  assert.throws(() => validateDesigns([proposals[0], proposals[0], proposals[0]], palette));
  assert.throws(() => validateDesigns(proposals.slice(1), palette));
});

test('Repeated layouts become three different compositions without changing copy or emphasis', () => {
  const same = proposals.map(p => ({ ...p, layout: 'classic' }));
  const result = diversifyLayouts(same);
  assert.equal(new Set(result.map(p => p.layout)).size, 3);
  assert.deepEqual(result.map(p => p.lines), same.map(p => p.lines));
  assert.deepEqual(result.map(p => p.emphasis), same.map(p => p.emphasis));
});

test('Layout engine preserves reading order, keeps text inside the coaster and handles empty edited lines', () => {
  for (const layout of Object.keys(layouts)) for (const typography of ['sans', 'serif', 'mono']) {
    for (const lines of [['110', 'e sete di futuro'], ['Prescrivo uno', 'SPRITZ', 'ogni sera.'], ['W'.repeat(24), 'M'.repeat(24), 'i'.repeat(24)], ['', 'SPRITZ', 'meritato.'], ['']]) {
      for (let emphasis = 0; emphasis < lines.length; emphasis++) {
        const design = { ...exampleDesign, layout, typography, lines, emphasis };
        const { texts } = composeCoaster(design);
        assert.deepEqual([...texts].sort((a, b) => a.y - b.y).map(t => t.text), lines.filter(Boolean));
        for (const t of texts) {
          const left = t.anchor === 'start' ? t.x : t.x - t.width / 2;
          const right = left + t.width;
          for (const x of [left, right]) for (const y of [t.y - t.fontSize * .8, t.y + t.fontSize * .25]) {
            assert(Math.hypot(x - 50, y - 49) <= 43.01, `${layout}: text outside safe circle`);
          }
          assert(t.fontSize > 0 && Number.isFinite(t.fontSize));
        }
      }
    }
  }
});

test('Short hero words are visibly larger and templates have different positions', () => {
  const positions = new Set();
  for (const layout of Object.keys(layouts)) {
    const composition = composeCoaster({ ...exampleDesign, layout });
    const hero = composition.texts.find(t => t.emphasis);
    assert(hero.fontSize > Math.max(...composition.texts.filter(t => !t.emphasis).map(t => t.fontSize)) * 1.6);
    positions.add(JSON.stringify(composition));
  }
  assert.equal(positions.size, Object.keys(layouts).length);
});

test('Quota enforces cooldown, hourly client limit, global cap, and UTC day reset', () => {
  const now = Date.parse('2026-09-20T12:00:00Z');
  let { state } = reserveQuota(undefined, 'one', now, 30);
  assert.equal(reserveQuota(state, 'one', now + 1000, 30).allowed, false);
  for (let i = 1; i < 10; i++) {
    const next = reserveQuota(state, 'one', now + i * 11000, 30);
    assert.equal(next.allowed, true); state = next.state;
  }
  assert.equal(reserveQuota(state, 'one', now + 200000, 30).allowed, false);
  assert.equal(reserveQuota(state, 'two', now + 200000, 10).allowed, false);
  assert.equal(reserveQuota(state, 'one', now + 3600000, 30).allowed, true);
  assert.equal(reserveQuota(state, 'one', now + 86400000, 1).allowed, true);
  assert.equal(reserveQuota(undefined, 'one', now, 0).allowed, false);

  // Configurable cooldown and limits via env/options
  const customEnv = { COASTER_DAILY_LIMIT: '50', COASTER_HOURLY_LIMIT: '5', COASTER_COOLDOWN_SECONDS: '2' };
  const first = reserveQuota(undefined, 'custom', now, customEnv);
  assert.equal(first.allowed, true);
  assert.equal(reserveQuota(first.state, 'custom', now + 1000, customEnv).allowed, false);
  assert.equal(reserveQuota(first.state, 'custom', now + 2100, customEnv).allowed, true);

  // Zero cooldown allows immediate subsequent calls
  const zeroCooldown = { COASTER_COOLDOWN_SECONDS: '0' };
  const zFirst = reserveQuota(undefined, 'fast', now, zeroCooldown);
  assert.equal(zFirst.allowed, true);
  assert.equal(reserveQuota(zFirst.state, 'fast', now + 100, zeroCooldown).allowed, true);
});


test('Rejects deprecated improve action and unknown actions before reserving quota', async () => {
  for (const action of ['improve', 'unknown', 'edit']) {
    const response = await handleCoasterRequest(
      request({ action, brief: 'Giulia medicina spritz', tone: 'ironico' }),
      options({ reserve: () => assert.fail('Must not reserve quota for invalid action') })
    );
    assert.equal(response.status, 400);
  }
});
