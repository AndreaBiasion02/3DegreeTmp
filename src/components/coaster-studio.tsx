"use client";

import { useRef, useState, type FormEvent } from 'react';
import { Sparkles, ArrowRight, Download, Check, LoaderCircle } from 'lucide-react';
import { filamentPalette } from '@/lib/filament-colors';
import { exampleDesign, icons, layouts, typographies, iconStyles, tones, validLine, validateDesigns } from '@/lib/coaster-design.mjs';

import CoasterPreview, { SymbolGraphic, type CoasterDesign as Design } from './coaster-preview';

const initial = exampleDesign as Design;
const fieldClass = 'mt-2 w-full rounded-xl border border-brand-primary/25 bg-white px-4 py-3 text-brand-dark';

function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CoasterStudio() {
  const [symbolSearch, setSymbolSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [brief, setBrief] = useState('');
  const [tone, setTone] = useState<keyof typeof tones>('ironico');
  const [proposals, setProposals] = useState<Design[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [design, setDesign] = useState<Design>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const busy = useRef(false);
  const preview = useRef<HTMLDivElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const canGenerate = brief.trim().length >= 10 && brief.length <= 600;
  const canExport = design.lines.some(line => line.trim()) && design.lines.every(line => !line.trim() || validLine(line));

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (busy.current || !canGenerate) return;
    if (Date.now() < cooldownUntil) { setError('Attendi ancora un momento prima di generare altre idee.'); return; }
    busy.current = true; setLoading(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/coaster-ideas', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(35000), body: JSON.stringify({ brief, tone, avoid: proposals.map(p => p.lines.join(' ')) }) });
      if (response.status === 429) setCooldownUntil(Date.now() + Number(response.headers.get('Retry-After') || 60) * 1000);
      const data = await response.json().catch(() => { throw new Error('La generazione AI non è disponibile su questa anteprima. Puoi modificare il sottobicchiere di esempio.'); });
      if (!response.ok) throw new Error(data.error || 'Generazione non disponibile. Riprova tra poco.');
      const next = validateDesigns(data.proposals, filamentPalette) as Design[];
      setProposals(next); setSelected(0); setDesign(next[0]);
      setNotice('Tre nuove idee pronte. La prima è selezionata: scegli la tua preferita e personalizzala.');
      requestAnimationFrame(() => results.current?.focus());
    } catch (e) {
      setError(e instanceof Error && e.name !== 'TimeoutError' ? e.message : 'La richiesta sta impiegando troppo tempo. Riprova tra poco.');
    } finally { busy.current = false; setLoading(false); }
  }

  function patch(values: Partial<Design>) { setDesign(previous => ({ ...previous, ...values })); setNotice(''); }
  function choose(index: number) { setSelected(index); setDesign(proposals[index]); setNotice(`Selezionata: ${proposals[index].title}.`); }
  function color(role: 'background' | 'foreground', hex: string) {
    const other = role === 'background' ? 'foreground' : 'background';
    patch({ [role]: hex, ...(design[other] === hex ? { [other]: design[role] } : {}) });
  }
  async function exportPreview() {
    const svg = preview.current?.querySelector('svg');
    if (!svg || !canExport || exporting) return;
    setExporting(true); setError('');
    try {
      const { exportCoasterSvg } = await import('@/lib/coaster-svg');
      const content = await exportCoasterSvg(svg);
      downloadFile(new Blob([content], { type: 'image/svg+xml' }), '3degree-sottobicchiere-70mm.svg');
      setNotice('SVG scaricato! Inviacelo nei DM dei social o via email per la stampa.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Download non riuscito. Riprova.'); }
    finally { setExporting(false); }
  }

  return <section id="crea-con-ai" aria-labelledby="coaster-studio-title" className="mb-16 overflow-hidden rounded-[2rem] border border-brand-primary/20 bg-brand-paper">
    <div className="border-b border-brand-primary/15 p-6 small:p-10">
      <span className="brand-kicker inline-flex items-center gap-2"><Sparkles size={16} aria-hidden="true" /> Il tuo sottobicchiere, la tua storia</span>
      <h2 id="coaster-studio-title" className="brand-heading mt-4 text-3xl small:text-5xl">Una laurea. Mille cose da dire.</h2>
      <p className="mt-4 max-w-2xl text-lg text-brand-dark/75">Raccontaci chi festeggi: l’AI inventa tre idee con frasi e simboli. Tu scegli quella giusta e la fai tua.</p>
    </div>
    <div className="grid gap-8 p-6 small:grid-cols-2 small:p-10">
      <form onSubmit={generate} className="min-w-0">
        <label htmlFor="coaster-brief" className="text-lg font-bold">Per chi brindiamo?</label>
        <textarea id="coaster-brief" className={`${fieldClass} min-h-[150px] resize-y`} placeholder="Giulia, laureata in medicina. Ama lo spritz, odia la sveglia e ha sempre una battuta pronta." value={brief} minLength={10} maxLength={600} required disabled={loading} onChange={e => setBrief(e.target.value)} aria-describedby="coaster-brief-help" />
        <p id="coaster-brief-help" className="mt-2 text-sm text-brand-dark/65">Facoltà, passioni, abitudini: bastano pochi dettagli. {brief.length}/600</p>
        <fieldset className="mt-6" disabled={loading}>
          <legend className="font-bold">Che tono gli diamo?</legend>
          <div className="mt-3 flex flex-wrap gap-2">{Object.entries(tones).map(([key, label]) => <label key={key} className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-bold ${tone === key ? 'border-brand-primary bg-brand-primary text-white' : 'border-brand-primary/25 bg-white text-brand-primary'}`}>
            <input type="radio" name="coaster-tone" value={key} checked={tone === key} onChange={() => setTone(key as keyof typeof tones)} className="sr-only peer" /><span className="peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4">{label}</span>
          </label>)}</div>
        </fieldset>
        <button type="submit" disabled={loading || !canGenerate} className="brand-button mt-7 gap-2 disabled:cursor-not-allowed disabled:opacity-50">{loading ? <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}{loading ? 'Sto inventando le tue idee…' : proposals.length ? 'Inventa altre 3 idee' : 'Inventa 3 idee'}</button>
        <p className="mt-3 text-xs leading-relaxed text-brand-dark/65">La descrizione viene inviata a OpenAI quando generi le proposte. Usa solo i dettagli che desideri condividere.</p>
        <div aria-live="polite" aria-atomic="true" className="mt-4 text-sm">{loading && <p>Stiamo cercando le parole giuste per il tuo brindisi.</p>}{notice && <p className="font-bold text-brand-primary">{notice}</p>}</div>
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-white p-4 text-sm text-red-800">{error}</p>}
      </form>
      <div className="min-w-0 rounded-3xl bg-white/70 p-5 small:p-7">
        <div className="mb-3 flex items-center justify-between gap-3 text-sm"><span className="font-bold">{proposals.length ? 'La tua anteprima' : 'Un esempio da personalizzare'}</span><span className="text-brand-dark/60">Ø 70 mm</span></div>
        <div ref={preview}><CoasterPreview design={design} /></div>
        <p className="mt-3 text-center text-xs text-brand-dark/60">Vista dall’alto · diametro 7 cm · colori indicativi</p>
      </div>
    </div>
    {proposals.length > 0 && <div ref={results} tabIndex={-1} aria-label="Tre proposte generate" className="px-6 pb-8 outline-offset-4 small:px-10">
      <h3 className="mb-4 text-xl font-bold">Tre modi di festeggiare. Qual è il tuo?</h3>
      <div className="grid gap-4 small:grid-cols-3">{proposals.map((proposal, index) => <button type="button" key={index} aria-pressed={selected === index} onClick={() => choose(index)} disabled={loading} className={`rounded-2xl border-2 bg-white p-4 text-left transition-colors ${selected === index ? 'border-brand-primary' : 'border-transparent hover:border-brand-primary/30'}`}>
        <CoasterPreview design={proposal} /><span className="mt-3 flex items-center justify-between gap-2 font-bold">{proposal.title}{selected === index ? <Check size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}</span>
        <span className="mt-2 block text-sm text-brand-dark/70">{proposal.lines.join(' ')}</span>
      </button>)}</div>
    </div>}
    <fieldset disabled={loading} className="border-t border-brand-primary/15 p-6 small:p-10">
      <legend className="sr-only">Personalizza la proposta</legend>
      <h3 className="text-2xl font-bold">L’ultimo tocco è tuo.</h3>
      <div className="mt-5 grid gap-6 small:grid-cols-2">
        <div><p className="mb-3 text-sm text-brand-dark/70">Fino a tre righe, 24 caratteri per riga.</p>{[0, 1, 2].map(index => <label key={index} htmlFor={`coaster-line-${index}`} className="mb-3 block text-sm font-bold">Riga {index + 1}<input id={`coaster-line-${index}`} className={fieldClass} maxLength={24} value={design.lines[index] || ''} onChange={e => { const lines = [...design.lines]; while (lines.length < 3) lines.push(''); lines[index] = e.target.value; patch({ lines }); }} /></label>)}
          {!canExport && <p role="status" className="text-sm text-red-800">Inserisci almeno una riga. Usa lettere latine, numeri e punteggiatura; scegli i simboli dal menu.</p>}
        </div>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3"><label htmlFor="coaster-icon" className="text-sm font-bold">Simbolo<select id="coaster-icon" className={fieldClass} value={design.icon} onChange={e => patch({ icon: e.target.value as Design['icon'] })}>{Object.entries(icons).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label htmlFor="coaster-layout" className="text-sm font-bold">Stile<select id="coaster-layout" className={fieldClass} value={design.layout} onChange={e => patch({ layout: e.target.value as Design['layout'] })}>{Object.entries(layouts).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
          <div className="grid grid-cols-2 gap-3">
            <label htmlFor="coaster-emphasis" className="text-sm font-bold">Riga protagonista<select id="coaster-emphasis" className={fieldClass} value={design.emphasis} onChange={e => patch({ emphasis: Number(e.target.value) })}>{[0, 1, 2].map(i => <option key={i} value={i} disabled={!design.lines[i]?.trim()}>Riga {i + 1}{design.lines[i] ? ` · ${design.lines[i]}` : ''}</option>)}</select></label>
            <label htmlFor="coaster-typography" className="text-sm font-bold">Carattere<select id="coaster-typography" className={fieldClass} value={design.layout === 'ticket' ? 'mono' : design.typography} disabled={loading || design.layout === 'ticket'} onChange={e => patch({ typography: e.target.value as Design['typography'] })}>{Object.entries(typographies).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          </div>
          <p className="text-xs leading-relaxed text-brand-dark/65">Metti la parola chiave su una riga tutta sua: avrà più spazio e risalto. La finestra pop usa il carattere da macchina da scrivere.</p>
          <div className="grid grid-cols-2 gap-3">
            <label htmlFor="coaster-secondary" className="text-sm font-bold">Secondo simbolo<select id="coaster-secondary" className={fieldClass} value={design.secondaryIcon || 'none'} onChange={e => patch({ secondaryIcon: e.target.value })}>{Object.entries(icons).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label htmlFor="coaster-icon-style" className="text-sm font-bold">Aspetto dei simboli<select id="coaster-icon-style" className={fieldClass} value={design.iconStyle || 'outline'} onChange={e => patch({ iconStyle: e.target.value as Design['iconStyle'] })}>{Object.entries(iconStyles).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          </div>
          <div><label htmlFor="coaster-symbol-search" className="text-sm font-bold">Trova il simbolo principale<input id="coaster-symbol-search" type="search" className={fieldClass} placeholder="Es. medicina, musica, gatto, spritz…" value={symbolSearch} onChange={e => setSymbolSearch(e.target.value)} /></label>
            <div className="mt-3 grid max-h-48 grid-cols-4 gap-2 overflow-y-auto p-1">{Object.entries(icons).filter(([, label]) => label.toLocaleLowerCase('it').includes(symbolSearch.trim().toLocaleLowerCase('it'))).map(([name, label]) => <button key={name} type="button" title={label} aria-label={`Scegli simbolo: ${label}`} aria-pressed={design.icon === name} onClick={() => patch({ icon: name as Design['icon'] })} className={`flex min-h-16 flex-col items-center justify-center rounded-xl border p-2 ${design.icon === name ? 'border-brand-primary bg-brand-primary text-white' : 'border-brand-primary/20 bg-white'}`}><svg viewBox="-4 -4 32 32" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><SymbolGraphic name={name} /></svg><span className="mt-1 max-w-full truncate text-xs">{label.split(',')[0]}</span></button>)}</div>
            {Object.entries(icons).every(([, label]) => !label.toLocaleLowerCase('it').includes(symbolSearch.trim().toLocaleLowerCase('it'))) && <p className="mt-2 text-sm">Nessun simbolo trovato. Prova una parola più semplice.</p>}
          </div>
          {(['background', 'foreground'] as const).map(role => <fieldset key={role}><legend className="mb-2 text-sm font-bold">{role === 'background' ? 'Colore del sottobicchiere' : 'Colore di scritte e simbolo'}</legend><div className="flex flex-wrap gap-2">{filamentPalette.map(c => <button type="button" key={c.hex} title={c.name} aria-label={`${role === 'background' ? 'Sfondo' : 'Grafica'}: ${c.name}`} aria-pressed={design[role] === c.hex} onClick={() => color(role, c.hex)} className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${design[role] === c.hex ? 'border-brand-primary ring-2 ring-brand-primary ring-offset-2' : 'border-black/15'}`} style={{ background: c.hex }}>{design[role] === c.hex && <Check size={18} color={['#ffffff', '#facc15', '#f97316'].includes(c.hex) ? '#17271c' : '#ffffff'} aria-hidden="true" />}</button>)}</div></fieldset>)}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={exportPreview} disabled={!canExport || exporting} className="brand-button gap-2 disabled:opacity-50"><Download size={16} aria-hidden="true" />{exporting ? 'Preparo lo SVG…' : 'Scarica SVG'}</button></div>
      <p className="mt-3 text-sm leading-relaxed text-brand-dark/75">Inviaci l’SVG nei DM sui social (<a href="https://www.instagram.com/3degree_lab/" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-brand-primary">Instagram @3degree_lab</a>, <a href="https://www.tiktok.com/@3degreelab" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-brand-primary">TikTok @3degreelab</a>) oppure via email a <a href="mailto:info@3degreelab.com" className="font-semibold underline hover:text-brand-primary">info@3degreelab.com</a>.</p>
    </fieldset>
  </section>;
}
