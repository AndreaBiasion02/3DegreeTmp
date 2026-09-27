"use client";

import { useRef, useState, type FormEvent } from 'react';
import { Check, Download, LoaderCircle, Sparkles } from 'lucide-react';
import { validLine } from '@/lib/coaster-design.mjs';
import { filamentName, filamentPalette } from '@/lib/filament-colors';
import { validateArtworks } from '@/lib/coaster-art.mjs';
import CoasterArtPreview, { type Artwork } from './coaster-art-preview';
import { useGenerationCooldown } from './use-generation-cooldown';

function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CoasterArtStudio() {
  const [brief, setBrief] = useState('');
  const [art, setArt] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { remaining, countdown, startCooldown } = useGenerationCooldown();
  const busy = useRef(false);
  const preview = useRef<HTMLDivElement>(null);
  const canGenerate = brief.trim().length >= 10 && brief.length <= 600;
  const canExport = !!art && art.paths.length > 0 && (art.imageComposition || art.texts.every(t => validLine(t.text)));

  async function requestIdeas(event: FormEvent) {
    event.preventDefault();
    if (busy.current || !canGenerate) return;
    if (remaining > 0) return;
    busy.current = true;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/coaster-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(120000),
        body: JSON.stringify({ brief }),
      });
      if (response.status === 429) { startCooldown(response.headers.get('Retry-After')); return; }
      const nextWait = response.headers.get('X-Generation-Retry-After');
      if (nextWait) startCooldown(nextWait);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generazione non disponibile. Riprova.');
      const validated = validateArtworks(data.proposals, filamentPalette) as Artwork[];
      if (!validated.length) throw new Error('Nessuna grafica generata. Riprova.');
      setArt(previous => {
        if (!previous) return validated[0];
        const next = { ...validated[0], background: previous.background, foreground: previous.foreground };
        if (next.accent === next.background || next.accent === next.foreground) delete next.accent;
        return next;
      });
      setNotice('Grafica pronta: controlla scritte e dettagli prima di scaricare lo SVG.');
      preview.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {
      setError(e instanceof Error && e.name !== 'TimeoutError' ? e.message : 'La generazione sta impiegando troppo tempo. Riprova.');
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  function changeColor(role: 'background' | 'foreground', hex: string) {
    setArt(previous => {
      if (!previous) return previous;
      const other = role === 'background' ? 'foreground' : 'background';
      const next = { ...previous, [role]: hex, ...(previous[other] === hex ? { [other]: previous[role] } : {}) };
      if (next.accent === next.background || next.accent === next.foreground) delete next.accent;
      return next;
    });
    setNotice('');
  }

  async function exportSvg() {
    const svg = preview.current?.querySelector('svg[data-export-svg]') as SVGSVGElement | null;
    if (!svg || !canExport || exporting) return;
    setExporting(true);
    setError('');
    try {
      const { exportCoasterSvg } = await import('@/lib/coaster-svg');
      const content = await exportCoasterSvg(svg);
      downloadFile(new Blob([content], { type: 'image/svg+xml' }), '3degree-sottobicchiere-70mm.svg');
      setNotice('SVG scaricato! Inviacelo nei DM dei social o via email per la stampa.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download non riuscito. Riprova.');
    } finally {
      setExporting(false);
    }
  }

  return <section id="crea-con-ai" aria-labelledby="coaster-studio-title" className="mb-16 overflow-hidden rounded-[2rem] border border-brand-primary/20 bg-brand-paper">
    <div className="border-b border-brand-primary/15 p-6 small:p-10">
      <span className="brand-kicker inline-flex items-center gap-2"><Sparkles size={16} aria-hidden="true" /> Il tuo sottobicchiere, la tua storia</span>
      <h2 id="coaster-studio-title" className="brand-heading mt-4 text-3xl small:text-5xl">Una laurea. Mille cose da dire.</h2>
      <p className="mt-4 max-w-2xl text-lg text-brand-dark/75">Descrivi la frase e tutti i soggetti che vuoi vedere. L’AI compone liberamente l’intera grafica.</p>
    </div>
    <div className="grid gap-8 p-6 small:grid-cols-2 small:p-10">
      <form onSubmit={requestIdeas} className="min-w-0">
        <label htmlFor="coaster-brief" className="text-lg font-bold">Che cosa disegniamo?</label>
        <textarea id="coaster-brief" className="mt-2 min-h-[150px] w-full resize-y rounded-xl border border-brand-primary/25 bg-white px-4 py-3 text-brand-dark" placeholder="Esempio: ‘Più mappe e meno problemi’, con una città, una mappa e piccoli segni di festa. Nessuna persona." value={brief} minLength={10} maxLength={600} required disabled={loading} onChange={e => setBrief(e.target.value)} />
        <p className="mt-2 text-sm text-brand-dark/65">Indica la frase esatta e ogni elemento che vuoi nella grafica. {brief.length}/600</p>
        <button type="submit" disabled={loading || !canGenerate || remaining > 0} className="brand-button mt-7 gap-2 disabled:cursor-not-allowed disabled:opacity-50">{loading ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}{loading ? 'Disegno la tua idea…' : art ? 'Genera un’altra idea' : 'Disegna la grafica'}</button>
        {remaining > 0 && <p role="timer" aria-live="off" className="mt-3 text-sm font-bold text-brand-primary">Potrai generare tra {countdown}.</p>}
        <p className="mt-3 text-xs leading-relaxed text-brand-dark/65">La descrizione viene inviata a OpenAI. Usa solo i dettagli che desideri condividere.</p>
        <div aria-live="polite" className="mt-4 text-sm">{notice && <p className="font-bold text-brand-primary">{notice}</p>}</div>
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-white p-4 text-sm text-red-800">{error}</p>}
      </form>
      <div className="min-w-0 rounded-3xl bg-white/70 p-5 small:p-7">
        <div className="mb-3 flex items-center justify-between gap-3 text-sm"><span className="font-bold">{art ? art.title : 'La tua anteprima'}</span><span className="text-brand-dark/60">Ø 70 mm</span></div>
        <div ref={preview}>{art ? <CoasterArtPreview art={art} /> : <div className="mx-auto flex aspect-square w-full max-w-[350px] items-center justify-center rounded-full bg-brand-primary/10 px-10 text-center text-brand-dark/60">La tua idea prenderà forma qui</div>}</div>
        <p className="mt-3 text-center text-xs text-brand-dark/60">Anteprima illustrativa · diametro 7 cm · grafica vettoriale monocromatica</p>
      </div>
    </div>
    {art && <div className="border-t border-brand-primary/15 p-6 small:p-10">
      <h3 className="text-2xl font-bold">La grafica è pronta.</h3>
      <p className="mt-2 text-sm text-brand-dark/70">La composizione resta quella creata dall’AI. Cambia i colori senza rigenerarla; per cambiare la scritta, modifica la descrizione e genera una nuova versione.</p>
      <div className="mt-6 grid gap-6 small:grid-cols-2">
        {(['background', 'foreground'] as const).map(role => <fieldset key={role}>
          <legend className="mb-3 text-sm font-bold">{role === 'background' ? 'Colore della base' : 'Colore della scritta e dei disegni'}: {filamentName(art[role])}</legend>
          <div className="flex flex-wrap gap-2">
            {filamentPalette.map(color => <button
              key={color.hex}
              type="button"
              title={color.name}
              aria-label={`${role === 'background' ? 'Base' : 'Scritta e disegni'}: ${color.name}`}
              aria-pressed={art[role] === color.hex}
              onClick={() => changeColor(role, color.hex)}
              className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${art[role] === color.hex ? 'border-brand-primary ring-2 ring-brand-primary ring-offset-2' : 'border-black/15'}`}
              style={{ backgroundColor: color.hex }}
            >{art[role] === color.hex && <Check size={18} color={['#ffffff', '#facc15', '#f97316'].includes(color.hex) ? '#17271c' : '#ffffff'} aria-hidden="true" />}</button>)}
          </div>
        </fieldset>)}
      </div>
      <button type="button" onClick={exportSvg} disabled={!canExport || exporting} className="brand-button mt-5 gap-2 disabled:opacity-50"><Download size={16} aria-hidden="true" />{exporting ? 'Preparo lo SVG…' : 'Scarica SVG'}</button>
      <p className="mt-3 text-sm leading-relaxed text-brand-dark/75">Inviaci l’SVG nei DM sui social (<a href="https://www.instagram.com/3degree_lab/" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-brand-primary">Instagram @3degree_lab</a>, <a href="https://www.tiktok.com/@3degreelab" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-brand-primary">TikTok @3degreelab</a>) oppure via email a <a href="mailto:info@3degreelab.com" className="font-semibold underline hover:text-brand-primary">info@3degreelab.com</a>.</p>
    </div>}
  </section>;
}
