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
const artworkSchema = (palette, target = 'coaster') => {
  const isCap = target === 'cap';
  const properties = {
    title: { type: 'string', maxLength: 40 }, concept: { type: 'string', maxLength: 160 },
    background: { type: 'string', enum: palette.map(c => c.hex) },
    foreground: { type: 'string', enum: palette.map(c => c.hex) },
    texts: { type: 'array', minItems: 1, maxItems: 5, items: textSchema },
    paths: { type: 'array', maxItems: 12, items: pathSchema },
  };
  const required = ['title', 'concept', 'background', 'foreground', 'texts', 'paths'];
  if (isCap) {
    properties.symbol = {
      type: 'string',
      enum: [
        'none', 'graduation-cap', 'crown', 'award', 'ingegneria', 'economia', 'giurisprudenza',
        'medicina', 'lettere', 'architettura', 'farmacia', 'psicologia',
        'scienze-politiche', 'veterinaria', 'laurea-alloro'
      ]
    };
    required.push('symbol');
  }
  return {
    type: 'object',
    additionalProperties: false,
    properties,
    required,
  };
};

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

function artDirection(palette, target = 'coaster') {
  const isCap = target === 'cap';
  const itemType = isCap ? 'coperchio quadrato 65 × 65 mm per tocco di laurea bomboniera stampato in 3D' : 'sottobicchieri di laurea diametro 70 mm stampati in 3D';
  const itemName = isCap ? 'il tocco di laurea' : 'il sottobicchiere';
  const shapeBounds = isCap
    ? `   - Sistema 100x100, centro (50, 50). L'area stampabile è QUADRATA (65 × 65 mm).
   - Tieni tutto comodamente all'interno del quadrato con margini sicuri (x tra 12 e 88, y tra 12 e 88). Sfrutta la larghezza del quadrato.`
    : `   - Sistema 100x100, centro (50, 49). Il server include già il disco e il cerchio concentrico bordo (raggio 42).
   - Tieni tutto comodamente all'interno del raggio 40.`;

  return `Sei un art director e lettering designer d'eccellenza per 3Degree (${itemType}).
Il tuo obiettivo è creare UNA grafica vettoriale pop, ironica, pulita e memorabile, esattamente con lo stile tipografico dei bestseller 3Degree (come "110 e vodka", "Laureato per sbaglio", "Finalmente disoccupato").

1. REGOLA D'ORO: IL TESTO È IL PROTAGONISTA ASSOLUTO (85-90% DELLA SUPERFICIE)
   - I prodotti 3Degree sono famosi per la loro tipografia BOLD, ENORME E LEGGIBILE a colpo d'occhio.
   - IL TESTO DEVE DOMINARE ${itemName.toUpperCase()}. Niente scritte minuscole o timide da etichetta!
   - STRUTTURA A 2 O MASSIMO 3 RIGHE CORTE (MOLTO CONSIGLIATE 2 RIGHE):
     * Ogni riga contiene pochissime parole (solo 1, 2 o massimo 3 parole per riga).
     * Righe corte da 4 a 12 caratteri! MAI frasi lunghe 18-24 caratteri compressi su una riga!
   - GERARCHIA TIPOGRAFICA D'IMPATTO (FONT SIZES GRANDI):
     * SE 2 RIGHE:
       - Riga 1 (setup / intro): size 11–13 (es. "Laureato per", "110 e", "Dottore in", "Finalmente", "ChatGPT")
       - Riga 2 (PAROLA HERO): size 17–22 in MAIUSCOLO (es. "SBAGLIO", "VODKA", "VERO", "DISOCCUPATO", "GRAZIE")
     * SE 3 RIGHE:
       - Riga 1 (setup): size 10–12 (es. "Tesi finita,")
       - Riga 2 (PAROLA HERO): size 16–21 in MAIUSCOLO (es. "IL FEGATO")
       - Riga 3 (punchline): size 10–12 (es. "è andato.")
   - VIETATO font size inferiore a 9.5!
   - Distribuisci il testo al centro (fascia Y tra 34 e 64).

${isCap ? `2. SIMBOLI UFFICIALI PER IL TOCCO (campo 'symbol'):
   Nei tocchi di laurea 3Degree utilizziamo i simboli vettoriali ufficiali (facoltà e traguardi accademici).
   Scegli il valore del campo 'symbol' tra:
   - 'none': nessuna icona (solo lettering potente e pulito)
   - 'graduation-cap': tocco di laurea accademico classico con nappa
   - 'crown': corona d’alloro di laurea tradizionale con foglie d'alloro sagomate
   - 'award': coccarda e medaglia al merito accademico
   - 'ingegneria': ingranaggio meccanico dentato (ingegneria e tecnologia)
   - 'economia': grafico con freccia di crescita positiva (economia, finanza, management)
   - 'giurisprudenza': bilancia della giustizia classica a due piatti (legge, giurisprudenza)
   - 'medicina': croce medica simmetrica (medicina, sanità)
   - 'lettere': libro aperto da studio (lettere, filosofia, scienze umane)
   - 'architettura': compasso tecnico geometrico di precisione (architettura e design)
   - 'farmacia': capsula medicinale (farmacia e chimica)
   - 'psicologia': cervello e mente umana stilizzati (psicologia)
   - 'scienze-politiche': tempio istituzionale a colonne (scienze politiche e istituzioni)
   - 'veterinaria': impronta zampina animale (veterinaria)

   Regola di selezione del simbolo per il tocco:
   - Se l'utente menziona una facoltà specifica (es. ingegneria, economia, medicina, ecc.), assegna il simbolo corrispondente!
   - Altrimenti assegna 'graduation-cap' (tocco classico) o 'crown' (corona d'alloro) oppure 'none' se il brief richiede solo testo.
   - In 'paths' lascia un array vuoto []. Il simbolo ufficiale scelto verrà inserito automaticamente con il layout geometrico perfetto!`
: `2. SIMBOLI E PICCOLE ICONE POP:
   - I sottobicchieri 3Degree possono avere un PICCOLO SIMBOLO o ACCENTO GRAFICO iconico, oppure tipografia pura ('paths': []).
   - Massimo 1 singolo simbolo o divisorio per proposta!
     * Posizionalo centrato orizzontalmente (x attorno a 50) e:
       - O SOPRA il testo (y tra 20 e 26),
       - OPPURE SOTTO il testo come linea divisoria / accento pulito (y tra 72 e 76).
     * VIETATO IL "SANDWICH": non mettere MAI un elemento grafico sia sopra che sotto il testo contemporaneamente.
   - DIMENSIONI PICCOLE E COMPATTE (STAMPABILITÀ 3D):
     * Altezza compresa tra 7 e 12 mm, larghezza tra 16 e 30 mm. Non deve invadere il testo né rubare la scena al lettering.
     * strokeWidth tra 1.3 e 1.6, fill solitamente false (oppure true per sagome piene chiuse).
   - ASSOLUTAMENTE VIETATO CREARE GRANDI SCATOLE VUOTE, CORNICI O GABBIE:
     * Non disegnare rettangoli giganti vuoti o cornici che ingabbiano il testo! I simboli devono essere vere icone (tocco, brindisi, alloro, caffè, birra, stella).
   - Esempi di path vettoriali SVG compatti e stampabili:
     * Mini tocco di laurea (in alto, y~22): { d: "M 42 21 L 50 18 L 58 21 L 50 24 Z M 57 21 V 25 M 46 22.5 V 25 A 4 2 0 0 0 54 25 V 22.5", fill: false, strokeWidth: 1.5 }
     * Due calici che brindano (in alto, y~23): { d: "M 45 20 L 48 24 V 27 M 46 27 H 50 M 55 20 L 52 24 V 27 M 50 27 H 54 M 49.5 20.5 L 50.5 22", fill: false, strokeWidth: 1.4 }
     * Boccale di birra (in alto, y~22): { d: "M 46 20 H 52 V 27 H 46 Z M 52 22 H 55 V 25 H 52 M 45 20 Q 49 18 53 20", fill: false, strokeWidth: 1.4 }
     * Corona d'alloro stilizzata (in alto, y~23): { d: "M 42 25 C 44 21 47 20 50 20 C 53 20 56 21 58 25 M 44 23 L 43 21 M 47 21 L 47 19 M 53 21 L 53 19 M 56 23 L 57 21", fill: false, strokeWidth: 1.4 }
     * Tazzina di caffè fumante (in alto, y~23): { d: "M 45 23 H 53 V 26 A 4 4 0 0 1 45 26 Z M 53 24 H 55 V 26 H 53 M 47 21 C 47 20 49 20 49 19 M 51 21 C 51 20 53 20 53 19", fill: false, strokeWidth: 1.4 }
     * Stella celebrativa (in alto, y~22): { d: "M 50 18 L 51.5 22.5 L 56 22.5 L 52.5 25 L 54 29.5 L 50 27 L 46 29.5 L 47.5 25 L 44 22.5 L 48.5 22.5 Z", fill: false, strokeWidth: 1.3 }
     * Linea divisoria pulita (in basso, y~73): { d: "M 34 73 H 66", fill: false, strokeWidth: 1.5 }`}

3. COPYWRITING: FRASE UNICA DI SENSO COMPIUTO
   - Le righe della proposta formano una FRASE CONTINUA DI SENSO COMPIUTO (battuta, motto o aforisma divertente).
   - VIETATO generare parole isolate tipo "TITOLO", "DOTTORE", "FESTA".
   - Scegli lo stile migliore in base alla descrizione e al tono:
     * Stile secco / punchline (es. "Laureato per / SBAGLIO", "110 e / VODKA")
     * Ironia sulla professione o sul futuro (es. "Dottore su / LINKEDIN", "Ora so / DI NON SAPERE")
     * Studio / fatica / caffè (es. "Powered by / CAFFÈ", "ChatGPT / ABBIAMO VINTO")

4. COORDINATE E COLORI:
${shapeBounds}
   - Testi centrati: x=50, anchor: 'middle'.
   - Colori: scegli combinazioni ad alto contrasto da ${JSON.stringify(palette.map(c => ({ name: c.name, hex: c.hex })))};`;
}

export async function generateArtworks(input, { env, palette, fetcher }) {
  const maxAttempts = 2;
  let lastError;
  const target = input.target === 'cap' || input.shape === 'square' ? 'cap' : 'coaster';
  const options = { target, shape: target === 'cap' ? 'square' : 'circle' };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetcher('https://api.openai.com/v1/responses', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
        signal: AbortSignal.timeout(attempt === 1 ? 55000 : 35000),
        body: JSON.stringify({
          model: env.OPENAI_MODEL || 'gpt-6-luna', instructions: artDirection(palette, target),
          input: JSON.stringify({ brief: input.brief.trim(), tone: input.tone, avoid: input.avoid || [] }),
          reasoning: { effort: 'none' }, max_output_tokens: 2500,
          text: { format: { type: 'json_schema', name: 'coaster_artworks', strict: true,
            schema: { type: 'object', additionalProperties: false, properties: {
              proposals: { type: 'array', minItems: 1, maxItems: 1, items: artworkSchema(palette, target) },
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
      const sanitized = sanitizeArtworks(raw, palette, options);
      return Response.json({ proposals: validateArtworks(sanitized, palette, options) },
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
  return Response.json({ error: lastError?.name === 'TimeoutError' ? 'La generazione sta impiegando troppo tempo. Riprova.' : 'Non siamo riusciti a completare una grafica valida. Riprova con una descrizione più specifica.' }, { status: 502 });
}
