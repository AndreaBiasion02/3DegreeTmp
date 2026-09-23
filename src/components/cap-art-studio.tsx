"use client";

import { useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Check, Download, LoaderCircle, Sparkles } from 'lucide-react';
import { tones, validLine } from '@/lib/coaster-design.mjs';
import { filamentPalette } from '@/lib/filament-colors';
import { validateArtworks } from '@/lib/coaster-art.mjs';
import { CAP_SYMBOLS, getCapSymbol } from '@/lib/cap-symbols';
import CapArtPreview from './cap-art-preview';
import type { Artwork } from './coaster-art-preview';

const fieldClass = 'mt-2 w-full rounded-xl border border-brand-primary/25 bg-white px-4 py-3 text-brand-dark';
function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CapArtStudio() {
  const [brief, setBrief] = useState('');
  const [tone, setTone] = useState<keyof typeof tones>('ironico');
  const [proposals, setProposals] = useState<Artwork[]>([]);
  const [selected, setSelected] = useState(0);
  const [art, setArt] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const busy = useRef(false);
  const preview = useRef<HTMLDivElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const canGenerate = brief.trim().length >= 10 && brief.length <= 600;
  const canExport = !!art && art.texts.some(t => t.text.trim()) && art.texts.every(t => !t.text.trim() || validLine(t.text));

  async function requestIdeas(event: FormEvent) {
    event.preventDefault();
    if (busy.current || !canGenerate) return;
    if (Date.now() < cooldownUntil) { setError('Attendi ancora un momento prima di generare altre idee.'); return; }
    busy.current = true; setLoading(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/coaster-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(75000),
        body: JSON.stringify({
          brief,
          tone,
          target: 'cap',
          shape: 'square',
          avoid: proposals.map(p => p.texts.map(t => t.text).join(' ').slice(0, 100)),
        }),
      });
      if (response.status === 429) setCooldownUntil(Date.now() + Number(response.headers.get('Retry-After') || 60) * 1000);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generazione non disponibile. Riprova.');
      const defaultGreen = '#218c45';
      const next = (validateArtworks(data.proposals, filamentPalette, { shape: 'square', target: 'cap' }) as Artwork[]).map(p => ({
        ...p,
        background: '#222222',
        foreground: (!p.foreground || p.foreground === '#ffffff' || p.foreground === '#222222') ? defaultGreen : p.foreground,
      }));
      setProposals(next); setSelected(0); setArt(next[0]);
      setNotice('Tre grafiche per il tocco pronte. Scegli quella che preferisci.');
      requestAnimationFrame(() => results.current?.focus());
    } catch (e) { setError(e instanceof Error && e.name !== 'TimeoutError' ? e.message : 'La generazione sta impiegando troppo tempo. Riprova.'); }
    finally { busy.current = false; setLoading(false); }
  }

  function choose(index: number) { setSelected(index); setArt(proposals[index]); setNotice(`Selezionata: ${proposals[index].title}.`); }
  function editText(index: number, text: string) {
    setArt(previous => previous && ({ ...previous, texts: previous.texts.map((item, i) => i === index ? { ...item, text } : item) }));
    setNotice('');
  }
  function changeAccentColor(hex: string) {
    setArt(previous => previous && ({ ...previous, background: '#222222', foreground: hex }));
    setNotice('');
  }
  function changeSymbol(symbolId: string) {
    if (!art) return;
    const sym = getCapSymbol(symbolId);
    setArt(previous => {
      if (!previous) return null;
      const paths = sym ? [{ d: sym.topPath, fill: sym.fill ?? false, strokeWidth: sym.strokeWidth ?? 1.5 }] : [];
      return {
        ...previous,
        symbol: symbolId,
        paths,
      };
    });
    setNotice(sym ? `Simbolo aggiornato: ${sym.label}.` : 'Simbolo rimosso (solo scritte).');
  }

  const currentSymbolId = art?.symbol || (art?.paths?.length ? (CAP_SYMBOLS.find(s => s.topPath === art.paths[0]?.d)?.id || 'graduation-cap') : 'none');
  async function exportSvg() {
    const svg = (preview.current?.querySelector('svg[data-export-svg]') || preview.current?.querySelector('svg')) as SVGSVGElement | null;
    if (!svg || !canExport || exporting) return;
    setExporting(true); setError('');
    try {
      const { exportCoasterSvg } = await import('@/lib/coaster-svg');
      const content = await exportCoasterSvg(svg, { sizeMm: 65, viewBox: '0 0 100 100' });
      downloadFile(new Blob([content], { type: 'image/svg+xml' }), '3degree-tocco-65mm.svg');
      setNotice('SVG scaricato! Inviacelo nei DM dei social o via email per la stampa.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Download non riuscito. Riprova.'); }
    finally { setExporting(false); }
  }

  return <section id="crea-con-ai" aria-labelledby="cap-studio-title" className="mb-16 overflow-hidden rounded-[2rem] border border-brand-primary/20 bg-brand-paper">
    <div className="border-b border-brand-primary/15 p-6 small:p-10">
      <span className="brand-kicker inline-flex items-center gap-2"><Sparkles size={16} aria-hidden="true" /> Il tuo tocco, la tua storia</span>
      <h2 id="cap-studio-title" className="brand-heading mt-4 text-3xl small:text-5xl">Crea la grafica del tuo tocco.</h2>
      <p className="mt-4 max-w-2xl text-lg text-brand-dark/75">Raccontaci il traguardo o chi festeggi: l’AI progetta tre idee grafiche su misura per il coperchio quadrato 65 × 65 mm.</p>
    </div>
    <div className="grid gap-8 p-6 small:grid-cols-2 small:p-10">
      <form onSubmit={requestIdeas} className="min-w-0">
        <label htmlFor="cap-brief" className="text-lg font-bold">Chi festeggiamo o che messaggio vuoi?</label>
        <textarea id="cap-brief" className={`${fieldClass} min-h-[150px] resize-y`} placeholder="Marco, laureato in ingegneria. Tanti esami, poco sonno, pronto a costruire il futuro." value={brief} minLength={10} maxLength={600} required disabled={loading} onChange={e => setBrief(e.target.value)} />
        <p className="mt-2 text-sm text-brand-dark/65">Facoltà, passioni, abitudini: bastano pochi dettagli. {brief.length}/600</p>
        <fieldset className="mt-6" disabled={loading}><legend className="font-bold">Che tono gli diamo?</legend><div className="mt-3 flex flex-wrap gap-2">{Object.entries(tones).map(([key, label]) => <label key={key} className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-bold ${tone === key ? 'border-brand-primary bg-brand-primary text-white' : 'border-brand-primary/25 bg-white text-brand-primary'}`}><input type="radio" name="cap-tone" value={key} checked={tone === key} onChange={() => setTone(key as keyof typeof tones)} className="sr-only peer" /><span className="peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4">{label}</span></label>)}</div></fieldset>
        <button type="submit" disabled={loading || !canGenerate} className="brand-button mt-7 gap-2 disabled:opacity-50">{loading ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}{loading ? 'Disegno il tuo tocco…' : proposals.length ? 'Disegna altre 3 idee' : 'Disegna 3 idee per il tocco'}</button>
        <p className="mt-3 text-xs leading-relaxed text-brand-dark/65">La descrizione viene inviata a OpenAI. Usa solo i dettagli che desideri condividere.</p>
        <div aria-live="polite" className="mt-4 text-sm">{notice && <p className="font-bold text-brand-primary">{notice}</p>}</div>
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-white p-4 text-sm text-red-800">{error}</p>}
      </form>
      <div className="min-w-0 rounded-3xl bg-white/70 p-5 small:p-7">
        <div className="mb-3 flex items-center justify-between gap-3 text-sm">
          <span className="font-bold">{art ? art.title : 'La tua anteprima'}</span>
          <span className="text-brand-dark/60">65 × 65 mm</span>
        </div>
        <div ref={preview}>
          {art ? <CapArtPreview art={art} /> : <div className="mx-auto flex aspect-square w-full max-w-[350px] items-center justify-center rounded-2xl bg-brand-primary/10 px-10 text-center text-brand-dark/60">La grafica del tuo tocco prenderà forma qui</div>}
        </div>
        <p className="mt-3 text-center text-xs text-brand-dark/60">Anteprima illustrativa · coperchio 65 × 65 mm · colori indicativi</p>
      </div>
    </div>
    {proposals.length > 0 && <div ref={results} tabIndex={-1} aria-label="Tre proposte generate" className="px-6 pb-8 outline-offset-4 small:px-10">
      <h3 className="mb-4 text-xl font-bold">Tre idee per il tocco, con testo e colori personalizzabili</h3>
      <div className="grid gap-4 small:grid-cols-3">
        {proposals.map((proposal, index) => <button type="button" key={index} aria-pressed={selected === index} onClick={() => choose(index)} className={`rounded-2xl border-2 bg-white p-4 text-left ${selected === index ? 'border-brand-primary' : 'border-transparent hover:border-brand-primary/30'}`}><CapArtPreview art={proposal} allow3D={false} /><span className="mt-3 flex items-center justify-between gap-2 font-bold">{proposal.title}{selected === index ? <Check size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}</span><span className="mt-2 block text-sm text-brand-dark/70">{proposal.concept}</span></button>)}
      </div>
    </div>}
    {art && <div className="border-t border-brand-primary/15 p-6 small:p-10">
      <h3 className="text-2xl font-bold">L’ultimo tocco è tuo.</h3>
      <p className="mt-2 text-sm text-brand-dark/70">Puoi correggere le scritte e scegliere i colori PLA. La composizione resta quella progettata dall’AI.</p>
      <div className="mt-5 grid gap-6 small:grid-cols-2">
        <div>
          {art.texts.map((t, index) => <label key={index} htmlFor={`cap-text-${index}`} className="mb-3 block text-sm font-bold">Testo {index + 1}<input id={`cap-text-${index}`} className={fieldClass} maxLength={24} value={t.text} onChange={e => editText(index, e.target.value)} /></label>)}
          {!canExport && <p role="status" className="text-sm text-red-800">Inserisci una scritta valida prima di scaricare lo SVG.</p>}
        </div>
        <div className="space-y-5">
          <fieldset>
            <legend className="mb-2 text-sm font-bold">Colore dettagli (scritte, fascia e anello)</legend>
            <div className="flex flex-wrap gap-2">
              {filamentPalette.map(c => (
                <button
                  type="button"
                  key={c.hex}
                  title={c.name}
                  aria-label={`Dettagli: ${c.name}`}
                  aria-pressed={art.foreground === c.hex}
                  onClick={() => changeAccentColor(c.hex)}
                  className={`h-11 w-11 rounded-full border-2 ${art.foreground === c.hex ? 'border-brand-primary ring-2 ring-brand-primary ring-offset-2' : 'border-black/15'}`}
                  style={{ background: c.hex }}
                />
              ))}
            </div>
          </fieldset>

          {/* Symbol / Faculty Selector */}
          <div>
            <label htmlFor="cap-symbol-select" className="mb-2 block text-sm font-bold">
              Simbolo facoltà o corona d’alloro
            </label>
            <select
              id="cap-symbol-select"
              className={fieldClass}
              value={currentSymbolId}
              onChange={e => changeSymbol(e.target.value)}
            >
              <option value="none">🎓 Nessun simbolo (solo scritte)</option>
              <optgroup label="Simboli di laurea e celebrazione">
                {CAP_SYMBOLS.filter(s => s.category === 'Laurea').map(s => (
                  <option key={s.id} value={s.id}>
                    {s.label} ({s.description})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Simboli di facoltà Lucide">
                {CAP_SYMBOLS.filter(s => s.category !== 'Laurea').map(s => (
                  <option key={s.id} value={s.id}>
                    {s.label} ({s.description})
                  </option>
                ))}
              </optgroup>
            </select>

            {/* Quick-choice chips for most popular symbols */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {[
                { id: 'none', label: 'Senza simbolo' },
                { id: 'graduation-cap', label: 'Tocco' },
                { id: 'crown', label: 'Corona d’alloro' },
                { id: 'ingegneria', label: 'Ingegneria' },
                { id: 'economia', label: 'Economia' },
                { id: 'medicina', label: 'Medicina' },
                { id: 'giurisprudenza', label: 'Giurisprudenza' },
              ].map(chip => (
                <button
                  type="button"
                  key={chip.id}
                  onClick={() => changeSymbol(chip.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    currentSymbolId === chip.id
                      ? 'border-brand-primary bg-brand-primary text-white'
                      : 'border-brand-primary/20 bg-white text-brand-dark/80 hover:border-brand-primary/40'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={exportSvg} disabled={!canExport || exporting} className="brand-button gap-2 disabled:opacity-50">
          <Download size={16} aria-hidden="true" />{exporting ? 'Preparo lo SVG…' : 'Scarica SVG'}
        </button>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-brand-dark/75">
        Inviaci l’SVG nei DM sui social (<a href="https://www.instagram.com/3degree_lab/" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-brand-primary">Instagram @3degree_lab</a>, <a href="https://www.tiktok.com/@3degreelab" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-brand-primary">TikTok @3degreelab</a>) oppure via email a <a href="mailto:info@3degreelab.com" className="font-semibold underline hover:text-brand-primary">info@3degreelab.com</a>.
      </p>
    </div>}
  </section>;
}
