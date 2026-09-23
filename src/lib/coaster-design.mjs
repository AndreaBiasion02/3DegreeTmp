import libraryIcons from './coaster-icons.json' with { type: 'json' };
export { libraryIcons };
export const COASTER_DIAMETER_MM = 70;
export const iconStyles = { outline: 'Contorno', sticker: 'Sticker', badge: 'Distintivo' };
export const fontFiles = { sans: '/fonts/coaster-noto-sans.woff', serif: '/fonts/coaster-noto-serif.woff', mono: '/fonts/coaster-roboto-mono.woff' };
export const fontFamilies = { sans: 'Coaster Sans', serif: 'Coaster Serif', mono: 'Coaster Mono' };
export const icons = { ...Object.fromEntries(Object.entries(libraryIcons).map(([key, icon]) => [key, icon.label])), none: 'Nessun simbolo', toast: 'Brindisi', coffee: 'Caffè', game: 'Controller', heart: 'Cuore', cap: 'Laurea', code: 'Codice', star: 'Stella', medicine: 'Medicina' };
export const layouts = { classic: 'Icona e titolo', bold: 'Parola protagonista', minimal: 'Editoriale', stamp: 'Timbro', ticket: 'Finestra pop', split: 'Fascia a contrasto', orbit: 'Orbita', laurel: 'Alloro', confetti: 'Coriandoli', medal: 'Medaglione' };
export const typographies = { sans: 'Deciso', serif: 'Elegante', mono: 'Macchina da scrivere' };
export const layoutDirections = {
  orbit: 'Orbita spaziale con anelli e stelle, parola centrale grande, icona in basso.',
  laurel: 'Corona di alloro per un traguardo, testo centrale e icona in basso.',
  confetti: 'Festa con coriandoli sul perimetro, icona in alto e titolo grande.',
  medal: 'Medaglione con bordo a raggi e un emblema in basso, ideale per premi ironici.',
  classic: 'Icona sopra, titolo grande e righe di supporto sotto.',
  bold: 'Poster tipografico: una parola cortissima enorme, icona piccola in basso, nessun cerchio decorativo.',
  minimal: 'Composizione editoriale allineata a sinistra, parola protagonista e simbolo in basso a destra.',
  stamp: 'Timbro ruotato con doppio bordo, parola centrale grande e simbolo in basso.',
  ticket: 'Finestra di computer con barra superiore e tipografia monospace. Adatta a frasi come messaggi di sistema.',
  split: 'Grande fascia centrale a colori invertiti per la parola protagonista, testi di supporto sopra e sotto.',
};
export const tones = { ironico: 'Ironico', pungente: 'Pungente', affettuoso: 'Affettuoso', elegante: 'Elegante' };
export const iconPaths = {
  toast: 'M4 3h16l-8 10L4 3ZM12 13v8M7 21h10M18 1l2 2',
  coffee: 'M3 8h13v9a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8ZM16 9h2a4 4 0 0 1 0 8h-2M6 2v3M11 2v3M2 23h17',
  game: 'M7 6h10l3 2 3 10-3 2-5-4H9l-5 4-3-2L4 8l3-2ZM7 9v6M4 12h6M16 10h1M19 13h1',
  heart: 'M12 21 3 12C-3 4 7-1 12 6 17-1 27 4 21 12L12 21Z',
  cap: 'M1 8 12 3l11 5-11 5L1 8ZM5 10v7q7 6 14 0v-7M23 8v10',
  code: 'm8 5-7 7 7 7M16 5l7 7-7 7M14 3l-4 18',
  star: 'm12 1 3.3 7 7.7 1-5.5 5.5 1.4 7.5-6.9-3.6L5.1 22l1.4-7.5L1 9l7.7-1L12 1Z',
  medicine: 'M8 2h8v6h6v8h-6v6H8v-6H2V8h6V2Z',
};

export function validLine(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 24 && /^[\p{Script=Latin}\p{N} .,!?…:;’'"+&()\/%=\-]+$/u.test(value);
}

export function defaultEmphasis(lines) {
  const candidates = lines.map((line, index) => ({ index, length: line.trim().length })).filter(p => p.length > 0);
  return candidates.sort((a, b) => a.length - b.length)[0]?.index ?? 0;
}

// Keep a stored/edited line's identity when another line is empty.
export function composeCoaster(design) {
  const entries = design.lines.map((text, index) => ({ text: text.trim(), index })).filter(p => p.text);
  const focus = entries.find(p => p.index === design.emphasis) ?? entries.find(p => p.index === defaultEmphasis(design.lines));
  const other = entries.filter(p => p !== focus);
  const layout = design.layout;
  const font = layout === 'ticket' ? 'mono' : (design.typography || 'sans');
  const texts = [];
  const add = (entry, x, y, size, width, anchor = 'middle', inverse = false) => {
    if (!entry) return;
    // Conservative widths + explicit SVG textLength keep all supported fonts in the safe area.
    const units = [...entry.text].reduce((sum, c) => sum + (font === 'mono' ? .62 : /[MW@%]/.test(c) ? 1 : /[ilI.,! '\u2019]/.test(c) ? .32 : .68), 0);
    const fontSize = Math.min(size, width / Math.max(units, 1));
    texts.push({ ...entry, x, y, fontSize, width: units * fontSize, anchor, inverse, font, emphasis: entry === focus });
  };
  let icon = { x: 42, y: 17, size: 16 };
  if (layout === 'classic' || layout === 'confetti') {
    if (layout === 'confetti') icon = { x: 41, y: 15, size: 18 };
    add(other[0], 50, 42, 5.5, 66);
    add(focus, 50, 59, 15, 72);
    add(other[1], 50, 72, 5.5, 62);
  } else if (layout === 'bold') {
    add(other[0], 50, 29, 6, 63);
    add(focus, 50, 57, 25, 81);
    add(other[1], 50, 70, 6, 68);
    icon = { x: 45, y: 77, size: 10 };
  } else if (layout === 'minimal') {
    add(other[0], 19, 32, 5.8, 60, 'start');
    add(focus, 19, 52, 17, 64, 'start');
    add(other[1], 19, 64, 5.8, 61, 'start');
    icon = { x: 66, y: 71, size: 13 };
  } else if (layout === 'stamp') {
    add(other[0], 50, 31, 5.8, 60);
    add(focus, 50, 54, 20, 73);
    add(other[1], 50, 68, 5.5, 62);
    icon = { x: 45, y: 74, size: 10 };
  } else if (layout === 'ticket') {
    add(other[0], 50, 39, 5.5, 63);
    add(focus, 50, 55, 17, 64);
    add(other[1], 50, 66, 5.5, 63);
    icon = { x: 43, y: 78, size: 14 };
  } else if (['orbit', 'laurel', 'medal'].includes(layout)) {
    add(other[0], 50, 32, 5.5, 54);
    add(focus, 50, layout === 'orbit' ? 52 : layout === 'laurel' ? 56 : 54, 20, 60);
    add(other[1], 50, 68, 5.5, 54);
    icon = { x: 44, y: 76, size: 12 };
  } else {
    add(other[0], 50, 29, 5.8, 61);
    add(focus, 50, 57, 22, 79, 'middle', true);
    add(other[1], 50, 73, 5.8, 63);
    icon = { x: 45, y: 80, size: 10 };
  }
  // Preserve reading order even when the first or last line is the largest.
  if (focus && entries.length > 1) {
    const sorted = [...texts].sort((a, b) => a.y - b.y);
    if (sorted.some((t, i) => t.index !== entries[i].index)) {
      // Reflow vertically using each line's own typographic size, within the same safe band.
      const gap = layout === 'ticket' ? 4 : 5;
      const ordered = entries.map(e => texts.find(t => t.index === e.index));
      const total = ordered.reduce((sum, t) => sum + t.fontSize, 0) + gap * (ordered.length - 1);
      const center = ['classic', 'confetti'].includes(layout) ? 55 : layout === 'minimal' ? 46 : layout === 'ticket' ? 50 : 49;
      let top = center - total / 2;
      for (const t of ordered) { t.y = top + t.fontSize * .8; top += t.fontSize + gap; }
      // The inverted band follows the highlighted word, not a fixed line number.
    }
  }
  // Fit the complete glyph box inside the circle, including in rotated stamps.
  for (const t of texts) {
    const radius = layout === 'stamp' ? 38 : ['laurel', 'medal', 'orbit'].includes(layout) ? 36 : 43;
    const dy = Math.max(Math.abs(t.y - t.fontSize * .8 - 49), Math.abs(t.y + t.fontSize * .25 - 49));
    const halfChord = Math.sqrt(Math.max(1, radius * radius - dy * dy));
    const available = t.anchor === 'start' ? 50 + halfChord - t.x : 2 * halfChord;
    const scale = Math.min(1, available / Math.max(t.width, 1));
    t.width *= scale;
    t.fontSize *= scale;
  }
  return { texts, icon, rotation: layout === 'stamp' ? -8 : 0 };
}

export function diversifyLayouts(proposals) {
  const used = new Set();
  const alternatives = Object.keys(layouts);
  return proposals.map(p => {
    const layout = used.has(p.layout) ? alternatives.find(candidate => !used.has(candidate)) : p.layout;
    used.add(layout);
    return { ...p, layout };
  });
}

export function validateDesigns(value, palette) {
  if (!Array.isArray(value) || value.length !== 3) throw new Error('Expected three proposals');
  const result = value.map(p => {
    if (!p || typeof p.title !== 'string' || p.title.trim().length < 1 || p.title.length > 40 ||
        !Array.isArray(p.lines) || p.lines.length < 1 || p.lines.length > 3 || !p.lines.every(validLine) ||
        !Object.hasOwn(icons, p.icon) || !Object.hasOwn(layouts, p.layout) ||
        (p.emphasis !== undefined && (!Number.isInteger(p.emphasis) || p.emphasis < 0 || p.emphasis >= p.lines.length)) ||
        (p.secondaryIcon !== undefined && !Object.hasOwn(icons, p.secondaryIcon)) ||
        (p.iconStyle !== undefined && !Object.hasOwn(iconStyles, p.iconStyle)) ||
        (p.typography !== undefined && !Object.hasOwn(typographies, p.typography)) ||
        !palette.some(c => c.hex === p.background) || !palette.some(c => c.hex === p.foreground) ||
        p.background === p.foreground) throw new Error('Invalid proposal');
    return { title: p.title.trim(), lines: p.lines.map(s => s.trim()), icon: p.icon, secondaryIcon: p.secondaryIcon ?? 'none', iconStyle: p.iconStyle ?? 'outline', layout: p.layout, emphasis: p.emphasis ?? defaultEmphasis(p.lines), typography: p.typography ?? 'sans', background: p.background, foreground: p.foreground };
  });
  if (new Set(result.map(p => p.lines.join(' ').toLocaleLowerCase('it'))).size !== 3) throw new Error('Duplicate proposals');
  return result;
}

export const exampleDesign = { title: 'Un brindisi meritato', lines: ['Laurea presa.', 'SPRITZ', 'meritato.'], emphasis: 1, typography: 'sans', icon: 'toast', secondaryIcon: 'none', iconStyle: 'outline', layout: 'bold', background: '#218c45', foreground: '#ffffff' };
