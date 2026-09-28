import { validateArtworks, sanitizeArtworks, getPathBounds } from '../src/lib/coaster-art.mjs';
import { getCoasterCategory } from '../src/lib/coaster-categories.mjs';

const textSchema = { type: 'object', additionalProperties: false, properties: {
  text: { type: 'string', maxLength: 24 }, x: { type: 'number' }, y: { type: 'number' },
  size: { type: 'number' }, maxWidth: { type: 'number' },
  font: { type: 'string', enum: ['sans', 'serif', 'mono', 'brush'] },
  anchor: { type: 'string', enum: ['start', 'middle', 'end'] }, inverse: { type: 'boolean' },
}, required: ['text', 'x', 'y', 'size', 'maxWidth', 'font', 'anchor', 'inverse'] };
const pathSchema = (isCap) => ({ type: 'object', additionalProperties: false, properties: {
  d: { type: 'string', maxLength: isCap ? 600 : 1200 }, fill: { type: 'boolean' }, strokeWidth: { type: 'number' },
  ...(!isCap && { role: { type: 'string', enum: ['foreground', 'accent'] } }),
}, required: isCap ? ['d', 'fill', 'strokeWidth'] : ['d', 'fill', 'strokeWidth', 'role'] });
const artworkSchema = (palette, target = 'coaster') => {
  const isCap = target === 'cap';
  const properties = {
    title: { type: 'string', maxLength: 40 }, concept: { type: 'string', maxLength: 160 },
    ...(!isCap && { illustrationSubject: { type: 'string', maxLength: 100 } }),
    background: { type: 'string', enum: palette.map(c => c.hex) },
    foreground: { type: 'string', enum: palette.map(c => c.hex) },
    ...(isCap ? {} : { accent: { type: 'string', enum: palette.map(c => c.hex) } }),
    texts: { type: 'array', minItems: 1, maxItems: 5, items: textSchema },
    paths: { type: 'array', maxItems: isCap ? 12 : 20, items: pathSchema(isCap) },
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
  else required.push('accent', 'illustrationSubject');
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
Il tuo obiettivo è creare UNA grafica vettoriale pop, ironica, pulita e memorabile. Usa la battuta originale e un'illustrazione semplice legata alla persona, nello spirito di un adesivo disegnato a mano.

1. REGOLA D'ORO: FRASE LEGGIBILE E ILLUSTRAZIONE RICONOSCIBILE
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
   - Per il sottobicchiere usa preferibilmente 2-3 righe e scegli 'brush' per un lettering morbido e deciso quando la descrizione suggerisce una battuta giocosa. 'sans' resta adatto a frasi più moderne, 'serif' a un registro elegante, 'mono' a battute tecniche.
   - Mantieni intatta ogni grafia o nome esplicitamente fornito nel brief; non correggere giochi di parole deliberati.
   - Distribuisci il testo nel centro lasciando aria all'illustrazione. Le lettere vengono trasformate in tracciati dal sito: fornisci stringhe e coordinate, non tentare di disegnare i glifi a mano.

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
: `2. ILLUSTRAZIONE VETTORIALE PER IL SOTTOBICCHIERE:
   - Compila 'illustrationSubject' con SOLO un soggetto visivo concreto (per esempio "quattro palazzi rettangolari uniti alla base", "un braccio con bicipite flesso" o "due omini stilizzati che brindano"). Non menzionare scritte, lettere, slogan o composizione.
   - Disegna un soggetto principale pertinente al brief: per esempio una città per urbanistica, un bicipite flesso per una persona sportiva, un microscopio per biologia. Crea una silhouette piena chiusa e 2-5 tratti interni, usando più path se servono.
   - Soggetto in alto: normalmente x=25..75, y=12..37, con ingombro massimo circa 45x25 nel sistema 100x100. Puoi disegnare anche una mappa, cuore o altra piccola firma sotto il testo tra y=74 e 84; non devono sovrapporsi alle lettere.
   - Gli accenti decorativi come stelline, raggi o segni di energia sono facoltativi: se non richiesti nel brief, aggiungine al massimo due in tutta la composizione, oppure nessuno. Lascia respirare testo e soggetto senza riempire gli spazi vuoti. Usa un massimo di 20 path totali. Il disegno deve restare nitido quando stampato a diametro 70 mm: niente dettagli più sottili di circa 1 unità del viewBox.
   - Usa 'role': 'foreground' per contorni e tratti scuri, 'accent' per un secondo colore. 'accent' deve essere diverso da background e foreground. Per l'icona usa una sagoma piena ('fill': true, path chiuso) e tratti interni robusti; per le linee aperte usa 'fill': false e strokeWidth tra 1.2 e 2.2.
   - Esempio di bicipite semplificato, in alto: silhouette { d: "M 38 20 Q 36 18 38 16 L 42 14 Q 44 13 45 16 L 47 20 Q 48 23 44 24 Q 43 28 46 32 Q 50 27 55 27 Q 61 27 63 33 Q 67 35 65 39 Q 53 45 39 39 Q 34 37 36 31 Z", fill: true, strokeWidth: 0, role: "accent" }; piega interna { d: "M 44 24 Q 42 32 46 34", fill: false, strokeWidth: 1.6, role: "foreground" }.
   - Non creare cornici o rettangoli giganti. Il bordo circolare è già aggiunto dal sito. Non usare emoji Unicode, immagini raster, testo dentro i path, gradienti o filigrane.`}

3. COPYWRITING: FRASE UNICA DI SENSO COMPIUTO
   - Le righe della proposta formano una FRASE CONTINUA DI SENSO COMPIUTO (battuta, motto o aforisma divertente).
   - VIETATO generare parole isolate tipo "TITOLO", "DOTTORE", "FESTA".
   - Scegli lo stile migliore in base alla descrizione:
     * Stile secco / punchline (es. "Laureato per / SBAGLIO", "110 e / VODKA")
     * Ironia sulla professione o sul futuro (es. "Dottore su / LINKEDIN", "Ora so / DI NON SAPERE")
     * Studio / fatica / caffè (es. "Powered by / CAFFÈ", "ChatGPT / ABBIAMO VINTO")

4. COORDINATE E COLORI:
${shapeBounds}
   - Testi centrati: x=50, anchor: 'middle'. Se due parole non entrano senza essere schiacciate, dividile in righe.
   - Colori: scegli combinazioni ad alto contrasto da ${JSON.stringify(palette.map(c => ({ name: c.name, hex: c.hex })))};${isCap ? '' : ' il campo accent deve essere distinto da background e foreground.'}`;
}

function hasIllustration(artwork) {
  return artwork.paths.some(path => {
    if (!path.fill || !/[zZ]\s*$/.test(path.d)) return false;
    const bounds = getPathBounds(path.d);
    return bounds && bounds.maxX - bounds.minX >= 12 && bounds.maxY - bounds.minY >= 7;
  });
}

async function generateImageComposition(input, { env, fetcher }) {
  const inkDirection = input.colorMode === 'duotone'
    ? 'Usa SOLO due inchiostri opachi piatti: NERO #222222 per testo e contorni, ROSSO #dc2626 per la parola chiave o alcune parti del disegno. Usa entrambi in aree ben distinte, senza sovrapposizioni; sfondo TRASPARENTE. Niente altri colori, grigi, foto, ombre, gradienti o texture.'
    : 'Solo NERO PURO opaco su sfondo TRASPARENTE: niente grigi, altri colori, foto, ombre, gradienti, texture o realismo.';
  const model = ['gpt-image-2.5-flare', 'gpt-image-2.5-sunburst'].includes(env.OPENAI_IMAGE_MODEL)
    ? env.OPENAI_IMAGE_MODEL : 'gpt-image-2.5-flare';
  try {
    const response = await fetcher('https://api.openai.com/v1/images/generations', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      signal: AbortSignal.timeout(85000),
      body: JSON.stringify({
        model, quality: 'low', size: '1024x1024', output_format: 'png', background: 'transparent', n: 1,
        prompt: `Crea l'intera grafica, vista dall'alto, per un sottobicchiere circolare di laurea da 70 mm.
Composizione originale e libera: la frase è protagonista, ma testo e disegni possono stare ovunque nel disco. Riproduci ESATTAMENTE la frase richiesta, inclusi nomi, accenti e giochi di parole; se manca, inventane una breve. Se il brief non indica soggetti, scegline uno pertinente; se ne chiede più di uno, rappresentali TUTTI distinti e riconoscibili, senza oggetti aggiuntivi.
Stile sticker illustrato, lettering grande ed espressivo, sagome semplici e contorni spessi. Lascia spazio vuoto tra gli elementi; evita collage di emoji, icone sparse e dettagli minuti. Stelline, scintille, trattini e raggi: al massimo due piccoli segni in totale se non richiesti, anche zero; se richiesti, rispetta la quantità indicata.
${inkDirection} Per la stampa 3D, tratti pieni di almeno 0,8 mm e vuoti essenziali di almeno 1 mm. Tutto entro l'area circolare con margine esterno, senza base piena; cornice solo se utile.
${getCoasterCategory(input.category)?.direction || ''}
Brief: ${input.brief.trim()}.`,
      }),
    });
    if (!response.ok) throw new Error(`Image generation HTTP ${response.status}`);
    // Stream the generated PNG JSON to the browser: VTracer cannot fit within Workers Free's CPU budget.
    return new Response(response.body, { status: 200, headers: {
      'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) {
    console.warn('[generateImageComposition] Failed:', error?.message || error);
    return Response.json({ error: 'La grafica generata non è risultata stampabile o il servizio immagini è occupato. Riprova con una descrizione più semplice.' }, { status: 502 });
  }
}

export async function generateArtworks(input, { env, palette, fetcher }) {
  const maxAttempts = 2;
  let lastError;
  const target = input.target === 'cap' || input.shape === 'square' ? 'cap' : 'coaster';
  const options = { target, shape: target === 'cap' ? 'square' : 'circle' };
  if (target === 'coaster' && env.COASTER_IMAGE_ENABLED !== '0') {
    return generateImageComposition(input, { env, fetcher });
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetcher('https://api.openai.com/v1/responses', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
        signal: AbortSignal.timeout(attempt === 1 ? 55000 : 35000),
        body: JSON.stringify({
          model: env.OPENAI_MODEL || 'gpt-6-luna', instructions: artDirection(palette, target) +
            (attempt > 1 && target === 'coaster' ? '\nLa proposta precedente non ha superato la verifica. Assicurati di includere una silhouette illustrativa piena, chiusa e ben visibile oltre al testo, con accenti separati dalle lettere.' : ''),
          input: JSON.stringify({ brief: input.brief.trim(), ...(target === 'coaster' && getCoasterCategory(input.category)?.direction ? { categoryDirection: getCoasterCategory(input.category).direction } : {}) }),
          reasoning: { effort: target === 'cap' ? 'none' : 'low' }, max_output_tokens: target === 'cap' ? 2500 : 5000,
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
      const proposals = validateArtworks(sanitized, palette, options);
      if (target === 'coaster' && input.colorMode === 'mono') {
        for (const proposal of proposals) {
          delete proposal.accent;
          proposal.paths = proposal.paths.map(path => ({ ...path, role: 'foreground' }));
        }
      }
      const wantsTextOnly = /\b(?:solo testo|senza (?:disegni|illustrazioni|icone))\b/i.test(input.brief);
      if (target === 'coaster' && !wantsTextOnly && !hasIllustration(proposals[0])) {
        throw new Error('Missing printable illustration');
      }
      return Response.json({ proposals, illustrationSource: 'vector' },
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
