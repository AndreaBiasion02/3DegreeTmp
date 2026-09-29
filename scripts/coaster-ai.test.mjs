import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { encode } from 'fast-png';
import { checkQuota, handleCoasterRequest, handleQuotaStatusRequest, reserveQuota } from '../server/coaster-api.mjs';
import { vectorizeCoasterComposition } from '../server/coaster-image-vectorizer.mjs';
import { exampleDesign, validateDesigns, composeCoaster, diversifyLayouts, layouts } from '../src/lib/coaster-design.mjs';
import { validateArtworks, sanitizeArtworks, getPathBounds } from '../src/lib/coaster-art.mjs';
import { coasterCategories } from '../src/lib/coaster-categories.mjs';
import { COASTER_BORDER_RADIUS, traceColorMasks } from '../src/lib/coaster-tracing.mjs';

test('Normalizes a model-drawn circular border to the same 2 mm inset', async () => {
  const width = 256, height = 256;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const radius = Math.hypot(x - 128, y - 128);
    const on = (radius > 96 && radius < 100) || (x >= 105 && x <= 150 && y >= 110 && y <= 140);
    if (on) { const i = (y * width + x) * 4; data[i] = data[i + 1] = data[i + 2] = 34; data[i + 3] = 255; }
  }
  const paths = await vectorizeCoasterComposition(Buffer.from(encode({ width, height, data })).toString('base64'), 'duotone');
  assert.equal(paths[0].fill, false);
  assert(Math.abs(getPathBounds(paths[0].d).maxRadius - COASTER_BORDER_RADIUS) < .01);
  assert(paths.slice(1).every(p => getPathBounds(p.d).maxRadius <= COASTER_BORDER_RADIUS - 2.9));
});

test('Two-ink tracing separates red details, ignores transparency/white and fits every layer to the disk', async () => {
  const width = 256, height = 256;
  const data = new Uint8Array(width * height * 4).fill(255);
  const put = (x, y, rgba) => data.set(rgba, (y * width + x) * 4);
  for (let y = 20; y < 90; y++) for (let x = 20; x < 90; x++) put(x, y, [34, 34, 34, 255]);
  for (let y = 160; y < 230; y++) for (let x = 160; x < 230; x++) put(x, y, [220, 38, 38, 255]);
  put(128, 128, [220, 38, 38, 0]);
  const masks = traceColorMasks({ width, height, data, channels: 4, depth: 8 });
  assert.deepEqual(masks.map(mask => mask.role), ['foreground', 'accent']);
  for (let i = 0; i < width * height * 4; i += 4) assert(masks[0].data[i] !== 0 || masks[1].data[i] !== 0);
  assert.equal(masks[1].data[(128 * width + 128) * 4], 255);
  const paths = await vectorizeCoasterComposition(Buffer.from(encode({ width, height, data })).toString('base64'), 'duotone');
  assert.deepEqual(new Set(paths.map(p => p.role)), new Set(['foreground', 'accent']));
  assert(paths.every(p => getPathBounds(p.d).maxRadius <= 45.51));
  assert.equal(paths.length, 2);
});

test('Duotone mode uses the same single low-quality request and invalid modes cannot spend quota', async () => {
  let calls = 0;
  await handleCoasterRequest(request({ brief: 'Un brindisi alla laurea', colorMode: 'duotone' }), options({
    env: { OPENAI_API_KEY: 'test-key' },
    fetcher: async (_url, init) => {
      calls++;
      const body = JSON.parse(init.body);
      assert.equal(body.n, 1);
      assert.equal(body.quality, 'low');
      assert.match(body.prompt, /NERO #222222/);
      assert.match(body.prompt, /ROSSO #dc2626/);
      return Response.json({ data: [{ b64_json: testPng() }] });
    },
  }));
  assert.equal(calls, 1);
  assert.equal((await handleCoasterRequest(request({ brief: 'Un brindisi alla laurea', colorMode: 'rainbow' }), options({ reserve: () => assert.fail('Must not reserve') }))).status, 400);
});

test('Categories guide both API paths and unknown categories cannot consume quota', async () => {
  for (const category of ['unknown', {}, null]) {
    assert.equal((await handleCoasterRequest(request({ brief: 'Un brindisi alla laurea', category }), options({ reserve: () => assert.fail('Must not reserve') }))).status, 400);
  }
  for (const imageEnabled of ['0', '1']) {
    let sent;
    const response = await handleCoasterRequest(request({ brief: 'Neo-disoccupato con due omini che brindano', category: 'meme' }), options({
      env: { OPENAI_API_KEY: 'test-key', COASTER_IMAGE_ENABLED: imageEnabled },
      fetcher: async (_url, init) => {
        sent = JSON.parse(init.body);
        return imageEnabled === '1' ? Response.json({ data: [{ b64_json: testPng() }] }) : options().fetcher();
      },
    }));
    assert.equal(response.status, 200);
    assert.match(sent.prompt || sent.input, /Neo-disoccupato/);
    assert.match(sent.prompt || sent.input, /Stile meme/);
    if (sent.prompt) assert(sent.prompt.endsWith('Brief: Neo-disoccupato con due omini che brindano.'));
  }
});

test('Category inspirations exist locally and briefs fit the API limit', () => {
  for (const category of coasterCategories) for (const example of category.examples) {
    assert(fs.existsSync(`public${example.image}`), example.image);
    assert(example.brief.length >= 10 && example.brief.length <= 600);
  }
});

const palette = JSON.parse(fs.readFileSync('src/lib/filament-palette.json', 'utf8'));
const proposals = ['Brindo alla laurea', 'Dottore in spritz', 'Tesi finita, cin cin'].map((text, i) => ({ ...exampleDesign, lines: [text], emphasis: 0, layout: ['bold', 'stamp', 'ticket'][i] }));
const artworks = ['LAUREA', 'SPRITZ', 'DOTTORE'].map((word, i) => ({ title: `Idea ${i + 1}`, concept: 'Un segno semplice e personale', illustrationSubject: 'un tocco di laurea semplice', background: '#218c45', foreground: '#ffffff', accent: '#facc15', texts: [{ text: word, x: 50, y: 52, size: 18, maxWidth: 68, font: 'brush', anchor: 'middle', inverse: false }], paths: [{ d: 'M39 15 Q 50 11 61 15 L 62 31 L 38 31 Z', fill: true, strokeWidth: 0.8, role: 'accent' }, { d: 'M32 69H68', fill: false, strokeWidth: 1.5, role: 'foreground' }] }));
const request = (body = { brief: 'Giulia ama medicina e spritz' }, headers = {}, method = 'POST') => new Request('https://example.com/api/coaster-ideas', { method, headers: { 'Content-Type': 'application/json', Origin: 'https://example.com', ...headers }, ...(method !== 'GET' ? { body: JSON.stringify(body) } : {}) });
const options = (extra = {}) => ({ env: { OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'gpt-6-luna', COASTER_IMAGE_ENABLED: '0' }, palette, client: 'hashed-client', reserve: async () => ({ allowed: true }), fetcher: async () => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ proposals: [artworks[0]] }) }] }] }), ...extra });

function testPng() {
  const width = 256, height = 256;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = (y * width + x) * 4;
    const leftObject = x >= 30 && x <= 88 && y >= 48 && y <= 142;
    const rightObject = x >= 165 && x <= 226 && y >= 105 && y <= 202;
    data[p + 3] = leftObject || rightObject ? 255 : 0;
  }
  return Buffer.from(encode({ width, height, data })).toString('base64');
}

test('Traces an entire two-object PNG without moving either object to the top', async () => {
  const paths = await vectorizeCoasterComposition(testPng());
  assert.equal(paths.length, 2);
  assert(paths.every(path => path.fill && path.role === 'foreground' && path.d.length <= 15000));
  const bounds = paths.map(path => getPathBounds(path.d)).sort((a, b) => a.centerX - b.centerX);
  assert(bounds[0].centerX < 35 && bounds[0].centerY < 40);
  assert(bounds[1].centerX > 65 && bounds[1].centerY > 55);
  await assert.rejects(() => vectorizeCoasterComposition('not-png'));
});

test('Fits rounded image contours as curves without breaking the printable bounds', async () => {
  const width = 512, height = 512;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = (y * width + x) * 4;
    const distance = Math.hypot(x - 256, y - 256);
    data[p + 3] = Math.max(0, Math.min(255, Math.round((174.5 - distance) * 255)));
  }
  const paths = await vectorizeCoasterComposition(Buffer.from(encode({ width, height, data })).toString('base64'));
  assert.equal(paths.length, 1);
  assert.match(paths[0].d, /C\s/);
  const bounds = getPathBounds(paths[0].d);
  assert(bounds.maxRadius < 48);
});

test('Requests one low-quality PNG and streams it for browser-side SVG conversion', async () => {
  const calls = [];
  const response = await handleCoasterRequest(request({ brief: 'Scrivi Il buon samuritano con un bicipite e una città' }), options({
    env: { OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'gpt-6-luna' },
    fetcher: async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      assert(url.endsWith('/images/generations'));
      return Response.json({ data: [{ b64_json: testPng() }] });
    },
  }));
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.model, 'gpt-image-2.5-flare');
  assert.equal(calls[0].body.quality, 'low');
  assert.equal(calls[0].body.output_format, 'png');
  assert.equal(calls[0].body.background, 'transparent');
  assert.match(calls[0].body.prompt, /bicipite e una città/);
  assert.match(calls[0].body.prompt, /rappresentali TUTTI/);
  assert.match(calls[0].body.prompt, /Riproduci ESATTAMENTE/);
  assert.match(calls[0].body.prompt, /al massimo due piccoli segni/);
  assert.match(calls[0].body.prompt, /0,8 mm.*1 mm/);
  assert(calls[0].body.prompt.length < 1300);
  assert.doesNotMatch(calls[0].body.prompt, /Evita queste frasi/);
  const body = await response.json();
  assert.equal(body.data[0].b64_json, testPng());
  assert.equal(body.proposals, undefined);
});

test('Reports an upstream image failure without substituting the old fixed layout', async () => {
  let calls = 0;
  const response = await handleCoasterRequest(request(), options({
    env: { OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'gpt-6-luna' },
    fetcher: async url => { calls++; assert(url.endsWith('/images/generations')); return Response.json({ error: 'upstream unavailable' }, { status: 503 }); },
  }));
  const body = await response.json();
  assert.equal(response.status, 502);
  assert.equal(calls, 1);
  assert.match(body.error, /stampabile/);
});

test('Generates validated vector artwork with bounded tokens and server-side credentials', async () => {
  let sent;
  const singleArtwork = [artworks[0]];
  const settings = options({ fetcher: async () => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ proposals: singleArtwork }) }] }] }) });
  const response = await handleCoasterRequest(request(), options({ fetcher: async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert(!url.includes('test-key'));
    assert.equal(init.headers.Authorization, 'Bearer test-key');
    sent = JSON.parse(init.body);
    assert.equal(sent.model, 'gpt-6-luna');
    assert.deepEqual(JSON.parse(sent.input), { brief: 'Giulia ama medicina e spritz' });
    assert.equal(sent.max_output_tokens, 5000);
    assert.deepEqual(sent.reasoning, { effort: 'low' });
    assert.equal(Object.hasOwn(sent, 'temperature'), false);
    assert.equal(sent.text.format.name, 'coaster_artworks');
    return settings.fetcher();
  } }));
  assert.equal(response.status, 200);
  assert.equal(sent.text.format.schema.properties.proposals.maxItems, 1);
  assert.equal(sent.text.format.schema.properties.proposals.minItems, 1);
  assert(sent.text.format.schema.properties.proposals.items.required.includes('paths'));
  assert(sent.text.format.schema.properties.proposals.items.required.includes('illustrationSubject'));
  assert(sent.text.format.schema.properties.proposals.items.required.includes('accent'));
  assert.equal(sent.text.format.schema.properties.proposals.items.properties.paths.maxItems, 20);
  const generated = (await response.json()).proposals[0];
  assert.equal(generated.texts[0].text, 'LAUREA');
  assert.equal(generated.texts[0].font, 'brush');
  assert.equal(generated.paths.length, 2);
  assert.equal(generated.paths[0].role, 'accent');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('Rejects unsafe vector commands and artwork outside the printable area', () => {
  for (const patch of [{ paths: [{ d: 'M20 20<script>', fill: false, strokeWidth: 1 }] }, { texts: [{ ...artworks[0].texts[0], x: 5 }] }, { texts: [{ ...artworks[0].texts[0], y: 95 }] }, { foreground: '#123456' }, { accent: '#123456' }]) {
    assert.throws(() => validateArtworks([{ ...artworks[0], ...patch }], palette));
  }
});

test('Retries a weak illustration and keeps both top artwork and bottom accents', async () => {
  const simple = { ...artworks[0], paths: [{ d: 'M32 69H68', fill: false, strokeWidth: 1.5, role: 'foreground' }] };
  let calls = 0;
  const response = await handleCoasterRequest(request(), options({ fetcher: async (url, init) => {
    calls++;
    if (calls === 2) assert.match(JSON.parse(init.body).instructions, /proposta precedente non ha superato/);
    return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ proposals: [calls === 1 ? simple : artworks[0]] }) }] }] });
  } }));
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
  const art = (await response.json()).proposals[0];
  assert.equal(art.paths.length, 2);
  assert.equal(art.paths[0].role, 'accent');
});

test('Keeps a multi-part illustration together when lettering needs reflow', () => {
  const art = { ...artworks[0], texts: [
    { text: 'Il buon', x: 50, y: 55, size: 12, maxWidth: 68, font: 'brush', anchor: 'middle', inverse: false },
    { text: 'SAMURITANO', x: 50, y: 73, size: 17, maxWidth: 76, font: 'brush', anchor: 'middle', inverse: false },
  ], paths: [
    { d: 'M 34 31 Q 31 28 34 24 L 40 18 Q 43 15 46 19 L 50 24 Q 53 20 57 20 Q 64 20 68 27 Q 71 31 68 34 Q 64 38 58 37 L 53 35 Q 50 39 44 39 L 36 37 Q 32 36 34 31 Z', fill: true, strokeWidth: 0, role: 'accent' },
    { d: 'M 42 22 Q 46 26 45 31', fill: false, strokeWidth: 1.8, role: 'foreground' },
    { d: 'M 55 24 Q 59 27 58 32', fill: false, strokeWidth: 1.8, role: 'foreground' },
    { d: 'M 34 73 H 66', fill: false, strokeWidth: 1.6, role: 'foreground' },
  ] };
  const result = validateArtworks(sanitizeArtworks([art], palette), palette)[0];
  assert.equal(result.paths.length, 4);
  assert(getPathBounds(result.paths[0].d).maxY <= 36);
  assert(getPathBounds(result.paths[3].d).minY >= 78);
  assert(result.texts[0].y < result.texts[1].y);
  assert(result.texts[1].maxWidth < 76);
});

test('Three-line lettering remains legible inside the round print area', () => {
  const art = { ...artworks[0], texts: [
    { text: 'Più mappe', x: 50, y: 51, size: 11, maxWidth: 70, font: 'brush', anchor: 'middle', inverse: false },
    { text: 'e meno', x: 50, y: 73, size: 18, maxWidth: 75, font: 'brush', anchor: 'middle', inverse: false },
    { text: 'problemi', x: 50, y: 88, size: 11, maxWidth: 75, font: 'brush', anchor: 'middle', inverse: false },
  ] };
  const result = validateArtworks(sanitizeArtworks([art], palette), palette)[0];
  assert.equal(result.texts.map(t => t.text).join(' '), 'Più mappe e meno problemi');
  assert(result.texts[2].y <= 80);
  assert(result.texts[2].maxWidth > 40);
  assert(result.texts.every(t => t.size >= 10));
});

test('Uses the first complete structured response when the provider sends extra text', async () => {
  const singleArtwork = [artworks[0]];
  const output = `${JSON.stringify({ proposals: singleArtwork })}\nThe assistant response must follow this JSON schema: {"type":"object"}`;
  const response = await handleCoasterRequest(request(), options({ fetcher: async () => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: output }] }] }) }));
  assert.equal(response.status, 200);
  const generated = (await response.json()).proposals[0];
  assert.equal(generated.texts[0].text, 'LAUREA');
  assert.equal(generated.paths.length, 2);
});

test('Rejects invalid inputs and oversized bodies before reserving quota', async () => {
  for (const body of [null, {}, { brief: 'short' }, { brief: 'a'.repeat(601) }, { brief: 'a'.repeat(20), target: 'unknown' }, { brief: 'a'.repeat(5000) }]) {
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
  const allowed = await handleCoasterRequest(request(), options({ reserve: async () => ({ allowed: true, nextAvailableAt: Date.now() + 30000 }) }));
  assert.equal(allowed.status, 200);
  assert(Number(allowed.headers.get('x-generation-retry-after')) > 0);
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
  const noMinute = { COASTER_DAILY_LIMIT: '30', COASTER_MINUTELY_LIMIT: '0' };
  let { state } = reserveQuota(undefined, 'one', now, noMinute);
  assert.equal(reserveQuota(state, 'one', now + 1000, noMinute).allowed, false);
  for (let i = 1; i < 10; i++) {
    const next = reserveQuota(state, 'one', now + i * 11000, noMinute);
    assert.equal(next.allowed, true); state = next.state;
  }
  assert.equal(reserveQuota(state, 'one', now + 200000, noMinute).allowed, false);
  assert.equal(reserveQuota(state, 'two', now + 200000, { ...noMinute, COASTER_DAILY_LIMIT: '10' }).allowed, false);
  assert.equal(reserveQuota(state, 'one', now + 3600000, noMinute).allowed, true);
  assert.equal(reserveQuota(state, 'one', now + 86400000, { ...noMinute, COASTER_DAILY_LIMIT: '1' }).allowed, true);
  assert.equal(reserveQuota(undefined, 'one', now, 0).allowed, false);

  // Configurable cooldown and limits via env/options
  const customEnv = { COASTER_DAILY_LIMIT: '50', COASTER_HOURLY_LIMIT: '5', COASTER_MINUTELY_LIMIT: '0', COASTER_COOLDOWN_SECONDS: '2' };
  const first = reserveQuota(undefined, 'custom', now, customEnv);
  assert.equal(first.allowed, true);
  assert.equal(reserveQuota(first.state, 'custom', now + 1000, customEnv).allowed, false);
  assert.equal(reserveQuota(first.state, 'custom', now + 2100, customEnv).allowed, true);

  // Zero cooldown allows immediate subsequent calls
  const zeroCooldown = { COASTER_COOLDOWN_SECONDS: '0', COASTER_MINUTELY_LIMIT: '0' };
  const zFirst = reserveQuota(undefined, 'fast', now, zeroCooldown);
  assert.equal(zFirst.allowed, true);
  assert.equal(reserveQuota(zFirst.state, 'fast', now + 100, zeroCooldown).allowed, true);
});

test('Quota limits a rolling minute and returns the actual wait when limits overlap', () => {
  const now = Date.parse('2026-09-20T12:00:00Z');
  const limits = { COASTER_DAILY_LIMIT: '100', COASTER_HOURLY_LIMIT: '10', COASTER_MINUTELY_LIMIT: '3', COASTER_COOLDOWN_SECONDS: '0' };
  let state;
  for (const offset of [0, 10000, 20000]) {
    const result = reserveQuota(state, 'one', now + offset, limits);
    assert.equal(result.allowed, true);
    state = result.state;
    assert.equal(result.nextAvailableAt, now + (offset === 20000 ? 60000 : offset));
  }
  const blocked = reserveQuota(state, 'one', now + 30000, limits);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfter, 30);
  assert.equal(reserveQuota(state, 'two', now + 30000, limits).allowed, true);
  assert.equal(reserveQuota(state, 'one', now + 60000, limits).allowed, true);

  const overlapping = { ...limits, COASTER_HOURLY_LIMIT: '1', COASTER_MINUTELY_LIMIT: '1' };
  const first = reserveQuota(undefined, 'single', now, overlapping);
  assert.equal(first.nextAvailableAt, now + 3600000);
  assert.equal(reserveQuota(first.state, 'single', now + 30000, overlapping).retryAfter, 3570);
});

test('Quota status reports the remaining wait without spending another attempt', async () => {
  const now = Date.parse('2026-09-20T12:00:00Z');
  const limits = { COASTER_MINUTELY_LIMIT: '1', COASTER_COOLDOWN_SECONDS: '0' };
  const { state } = reserveQuota(undefined, 'one', now, limits);
  const snapshot = JSON.stringify(state);
  assert.deepEqual(checkQuota(state, 'one', now + 30000, limits), { allowed: false, retryAfter: 30 });
  assert.equal(JSON.stringify(state), snapshot);
  const response = await handleQuotaStatusRequest(
    new Request('https://example.com/api/coaster-ideas/status', { headers: { Origin: 'https://example.com' } }),
    { env: limits, client: 'one', check: async () => checkQuota(state, 'one', now + 30000, limits) },
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { allowed: false, retryAfter: 30 });
  assert.deepEqual(checkQuota(state, 'one', now + 60000, limits), { allowed: true, retryAfter: 0 });
});


test('Rejects deprecated improve action and unknown actions before reserving quota', async () => {
  for (const action of ['improve', 'unknown', 'edit']) {
    const response = await handleCoasterRequest(
      request({ action, brief: 'Giulia medicina spritz' }),
      options({ reserve: () => assert.fail('Must not reserve quota for invalid action') })
    );
    assert.equal(response.status, 400);
  }
});

test('Supports square tocco cap generation and allows square bounds', async () => {
  const squareArtworks = [
    {
      title: 'Tocco 1', concept: 'Concept 1', background: '#222222', foreground: '#facc15',
      texts: [{ text: 'DOTTORE', x: 50, y: 50, size: 18, maxWidth: 78, font: 'sans', anchor: 'middle', inverse: false }],
      paths: [],
    },
    {
      title: 'Tocco 2', concept: 'Concept 2', background: '#2458b8', foreground: '#ffffff',
      texts: [{ text: 'INGEGNERE', x: 50, y: 50, size: 18, maxWidth: 78, font: 'sans', anchor: 'middle', inverse: false }],
      paths: [],
    },
    {
      title: 'Tocco 3', concept: 'Concept 3', background: '#218c45', foreground: '#ffffff',
      texts: [{ text: 'MAGISTRALE', x: 50, y: 50, size: 18, maxWidth: 78, font: 'sans', anchor: 'middle', inverse: false }],
      paths: [],
    },
  ];
  const validated = validateArtworks(squareArtworks, palette, { target: 'cap', shape: 'square' });
  assert.equal(validated.length, 3);

  const response = await handleCoasterRequest(
    request({ brief: 'Marco laureato in ingegneria civile', target: 'cap', shape: 'square' }),
    options({
      fetcher: async () => new Response(JSON.stringify({
        status: 'completed',
        output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ proposals: squareArtworks }) }] }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
  );
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.proposals.length, 3);
});

test('Supports official faculty and laurel symbols on tocco caps', async () => {
  const { getCapSymbol, CAP_SYMBOLS } = await import('../src/lib/cap-symbols.mjs');
  assert.equal(CAP_SYMBOLS.length, 13);
  const cap = getCapSymbol('graduation-cap');
  assert.ok(cap && cap.topPath);

  const ingegneria = getCapSymbol('ingegneria');
  assert.ok(ingegneria && ingegneria.topPath);

  const crown = getCapSymbol('crown');
  assert.ok(crown && crown.topPath);
  assert.equal(crown.label, 'Corona d’alloro');
  assert.equal(crown.fill, true);

  // Test aliases
  const laurelAlias = getCapSymbol('laurea-alloro');
  assert.equal(laurelAlias.id, 'crown');
  const alloroAlias = getCapSymbol('alloro');
  assert.equal(alloroAlias.id, 'crown');

  const artworksWithSymbols = [
    {
      title: 'Tocco Laurea', concept: 'Classico con corona d’alloro', background: '#222222', foreground: '#218c45',
      symbol: 'crown',
      texts: [{ text: '110 E LODE', x: 50, y: 55, size: 16, maxWidth: 70, font: 'sans', anchor: 'middle', inverse: false }],
      paths: [{ d: crown.topPath, fill: true, strokeWidth: 0 }],
    },
    {
      title: 'Tocco Ingegneria', concept: 'Ingegneria con ingranaggio', background: '#222222', foreground: '#2458b8',
      symbol: 'ingegneria',
      texts: [{ text: 'DOTTORE INGEGNERE', x: 50, y: 55, size: 14, maxWidth: 70, font: 'sans', anchor: 'middle', inverse: false }],
      paths: [{ d: ingegneria.topPath, fill: false, strokeWidth: 1.5 }],
    },
    {
      title: 'Tocco Solo Testo', concept: 'Minimalista puro', background: '#222222', foreground: '#dc2626',
      symbol: 'none',
      texts: [{ text: 'TESI FINITA', x: 50, y: 50, size: 18, maxWidth: 70, font: 'sans', anchor: 'middle', inverse: false }],
      paths: [],
    },
  ];

  const validated = validateArtworks(artworksWithSymbols, palette, { target: 'cap', shape: 'square' });
  assert.equal(validated.length, 3);
  assert.equal(validated[0].paths.length, 1);
  assert.equal(validated[1].paths.length, 1);
  assert.equal(validated[2].paths.length, 0);
  assert.equal(validated[0].symbol, 'crown');
  assert.equal(validated[1].symbol, 'ingegneria');
  assert.equal(validated[2].symbol, 'none');
});


