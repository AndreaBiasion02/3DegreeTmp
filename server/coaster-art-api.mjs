import { validateArtworks, sanitizeArtworks } from '../src/lib/coaster-art.mjs';

const textSchema = { type: 'object', additionalProperties: false, properties: {
  text: { type: 'string', maxLength: 24 }, x: { type: 'number' }, y: { type: 'number' },
  size: { type: 'number' }, maxWidth: { type: 'number' },
  font: { type: 'string', enum: ['sans', 'serif', 'mono'] },
  anchor: { type: 'string', enum: ['start', 'middle', 'end'] }, inverse: { type: 'boolean' },
}, required: ['text', 'x', 'y', 'size', 'maxWidth', 'font', 'anchor', 'inverse'] };
const pathSchema = { type: 'object', additionalProperties: false, properties: {
  d: { type: 'string', maxLength: 600 }, fill: { type: 'boolean' }, strokeWidth: { type: 'number' },
}, required: ['d', 'fill', 'strokeWidth'] };
const artworkSchema = palette => ({ type: 'object', additionalProperties: false, properties: {
  title: { type: 'string', maxLength: 40 }, concept: { type: 'string', maxLength: 160 },
  background: { type: 'string', enum: palette.map(c => c.hex) },
  foreground: { type: 'string', enum: palette.map(c => c.hex) },
  texts: { type: 'array', minItems: 1, maxItems: 5, items: textSchema },
  paths: { type: 'array', maxItems: 12, items: pathSchema },
}, required: ['title', 'concept', 'background', 'foreground', 'texts', 'paths'] });

function firstJsonObject(text) {
  const start = text.indexOf('{');
  if (start < 0) throw new Error('Missing JSON');
  let depth = 0; let quoted = false; let escaped = false;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) return JSON.parse(text.slice(start, index + 1));
  }
  throw new Error('Incomplete JSON');
}

function artDirection(palette) {
  return `Sei un art director e lettering designer d'eccellenza per 3Degree (sottobicchieri di laurea diametro 70 mm stampati in 3D).
Il tuo obiettivo è creare TRE grafiche vettoriali pop, ironiche, pulite e memorabili, esattamente con lo stile tipografico dei bestseller 3Degree (come "110 e vodka", "Laureato per sbaglio", "Finalmente disoccupato").

1. REGOLA D'ORO: IL TESTO È IL PROTAGONISTA ASSOLUTO (85-90% DELLA SUPERFICIE)
   - I sottobicchieri 3Degree sono famosi per la loro tipografia BOLD, ENORME E LEGGIBILE a colpo d'occhio.
   - IL TESTO DEVE DOMINARE IL SOTTOBICCHIERE. Niente scritte minuscole o timide da etichetta!
   - STRUTTURA A 2 O MASSIMO 3 RIGHE CORTE (MOLTO CONSIGLIATE 2 RIGHE):
     * Ogni riga contiene pochissime parole (solo 1, 2 o massimo 3 parole per riga).
     * Righe corte da 4 a 12 caratteri! MAI frasi lunghe 18-24 caratteri compressi su una riga!
   - GERARCHIA TIPOGRAFICA D'IMPATTO (FONT SIZES GRANDI):
     * SE 2 RIGHE (la composizione perfetta su cerchio da 70 mm):
       - Riga 1 (setup / intro): size 11–13 (es. "Laureato per", "110 e", "Dottore in", "Finalmente", "ChatGPT")
       - Riga 2 (PAROLA HERO): size 17–22 in MAIUSCOLO (es. "SBAGLIO", "VODKA", "VERO", "DISOCCUPATO", "GRAZIE")
     * SE 3 RIGHE:
       - Riga 1 (setup): size 10–12 (es. "Tesi finita,")
       - Riga 2 (PAROLA HERO): size 16–21 in MAIUSCOLO (es. "IL FEGATO")
       - Riga 3 (punchline): size 10–12 (es. "è andato.")
   - VIETATO font size inferiore a 9.5!
   - Distribuisci il testo al centro del cerchio (fascia Y tra 34 e 64).

2. SIMBOLI: PICCOLI ACCENTI DISCRETI O COMPLETAMENTE ASSENTI (ZERO SIMBOLI)
   - VIETATO CREARE GRANDI SCATOLE RETTANGOLARI VUOTE, GABBIE O CORNICI:
     * Non disegnare rettangoli giganti vuoti, cornici che circondano il testo, griglie o doppie pillole!
     * VIETATO IL "SANDWICH": non mettere MAI un simbolo sopra E un simbolo sotto il testo!
   - MASSIMO 1 SINGOLO ACCENTO / SIMBOLO PER SOTTOBICCHIERE (oppure ZERO simboli!).
   - ALMENO 1 PROPOSTA SU 3 DEVE ESSERE 'PURE TYPOGRAPHY' (paths: [], zero simboli, solo testo gigante e potente).
   - Se decidi di inserire un simbolo (massimo 1 solo elemento):
     * DEVE ESSERE PICCOLO E COMPATTO: altezza massima 8–11 mm, larghezza massima 20–28 mm.
     * Posizione: o sopra il testo (y tra 20 e 26) oppure una linea divisoria/accento pulito in basso (y tra 72 e 76).
     * Idee di simboli carini in stile meme sticker / universitario:
       - Due calici che brindano pop o boccale di birra (altezza ~9 mm)
       - Piccolo tocco di laurea stilizzato o corona d'alloro
       - Tazzina da caffè con fumo pop
       - Piccolo badge o spunta 'VERIFIED'
       - Una linea divisoria pulita (es. d: "M 32 72 H 68", strokeWidth: 1.5)
     * Tratti chiari e puliti, strokeWidth 1.3–1.6, ben stampabili in 3D.

3. COPYWRITING: FRASE UNICA DI SENSO COMPIUTO E VARIETÀ TOTALE
   - Le righe di ciascuna proposta formano una FRASE CONTINUA DI SENSO COMPIUTO (battuta, motto o aforisma divertente).
   - VIETATO generare parole isolate tipo "TITOLO", "DOTTORE", "FESTA".
   - TRE PROPOSTE = TRE BATTUTE / FRASI TOTALMENTE DIVERSE TRA LORO:
     Ciascuna delle 3 proposte deve avere un concept, una frase e una battuta completamente differenti.
     * Proposta 1: Stile secco / punchline (es. "Laureato per / SBAGLIO", "110 e / VODKA")
     * Proposta 2: Ironia sulla professione o sul futuro (es. "Dottore su / LINKEDIN", "Ora so / DI NON SAPERE")
     * Proposta 3: Studio / fatica / caffè (es. "Powered by / CAFFÈ", "ChatGPT / ABBIAMO VINTO")

4. COORDINATE E COLORI:
   - Sistema 100x100, centro (50, 49). Il server include già il disco e il cerchio concentrico bordo (raggio 42).
   - Tieni tutto comodamente all'interno del raggio 40.
   - Testi centrati: x=50, anchor: 'middle'.
   - Colori: scegli combinazioni ad alto contrasto da ${JSON.stringify(palette.map(c => ({ name: c.name, hex: c.hex })))};
   - Ogni proposta deve avere una combinazione colori e un layout differente dalle altre.`;
}

export async function generateArtworks(input, { env, palette, fetcher }) {
  const maxAttempts = 2;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetcher('https://api.openai.com/v1/responses', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
        signal: AbortSignal.timeout(attempt === 1 ? 55000 : 35000),
        body: JSON.stringify({
          model: env.OPENAI_MODEL || 'gpt-6-luna', instructions: artDirection(palette),
          input: JSON.stringify({ brief: input.brief.trim(), tone: input.tone, avoid: input.avoid || [] }),
          reasoning: { effort: 'none' }, max_output_tokens: 5000,
          text: { format: { type: 'json_schema', name: 'coaster_artworks', strict: true,
            schema: { type: 'object', additionalProperties: false, properties: {
              proposals: { type: 'array', minItems: 3, maxItems: 3, items: artworkSchema(palette) },
            }, required: ['proposals'] } } },
        }),
      });
      if (!response.ok) {
        if (attempt < maxAttempts) {
          console.warn(`[generateArtworks] Upstream HTTP ${response.status}, retrying attempt ${attempt + 1}...`);
          continue;
        }
        return Response.json({ error: 'Il servizio AI è momentaneamente occupato. Riprova tra poco.' }, { status: 502 });
      }
      const data = await (response.clone ? response.clone() : response).json();
      if (data.status !== 'completed') throw new Error('Incomplete generation');
      const text = data.output?.flatMap(item => item.type === 'message' ? item.content || [] : [])
        .filter(item => item.type === 'output_text').map(item => item.text).join('');
      const raw = firstJsonObject(text).proposals;
      const sanitized = sanitizeArtworks(raw, palette);
      return Response.json({ proposals: validateArtworks(sanitized, palette) },
        { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    } catch (error) {
      lastError = error;
      console.warn(`[generateArtworks] Attempt ${attempt} failed:`, error?.message || error);
      if (attempt < maxAttempts && error?.name !== 'TimeoutError') {
        console.warn(`[generateArtworks] Retrying generation...`);
        continue;
      }
    }
  }

  console.error('[generateArtworks error]', lastError);
  return Response.json({ error: lastError?.name === 'TimeoutError' ? 'La generazione sta impiegando troppo tempo. Riprova.' : 'Non siamo riusciti a completare tre grafiche valide. Riprova con una descrizione più specifica.' }, { status: 502 });
}
