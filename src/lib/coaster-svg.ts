import { fontFiles } from './coaster-design.mjs';

/** Export the same top-view artwork at physical size, with self-contained text outlines. */
export async function exportCoasterSvg(source: SVGSVGElement, options?: { sizeMm?: number; viewBox?: string }): Promise<string> {
  const target = (source.matches('[data-export-svg]')
    ? source
    : (source.querySelector('[data-export-svg]') as SVGSVGElement | null)) || source;
  const copy = target.cloneNode(true) as SVGSVGElement;
  const is65 = options?.sizeMm === 65 || target.getAttribute('width')?.includes('65') || source.getAttribute('data-cap-art') !== null;
  const sizeMm = is65 ? 65 : 75;
  copy.setAttribute('width', `${sizeMm}mm`);
  copy.setAttribute('height', `${sizeMm}mm`);
  copy.setAttribute('viewBox', options?.viewBox || (is65 ? '0 0 100 100' : '2 1 96 96'));
  copy.removeAttribute('class');
  copy.removeAttribute('data-export-svg');
  copy.removeAttribute('data-cap-art');
  copy.querySelectorAll('rect[width="465"], ellipse[cx="235"]').forEach(el => el.remove());
  const texts = [...copy.querySelectorAll('text')];
  const opentype = texts.length ? await import('opentype.js') : null;
  const families = [...new Set(texts.map(t => t.getAttribute('data-font') as keyof typeof fontFiles))];
  const fonts = new Map(await Promise.all(families.map(async family => {
    const response = await fetch(fontFiles[family]);
    if (!response.ok) throw new Error('Impossibile caricare il carattere per lo SVG. Riprova.');
    return [family, opentype!.parse(await response.arrayBuffer())] as const;
  })));
  for (const text of texts) {
    const font = fonts.get(text.getAttribute('data-font') as keyof typeof fontFiles)!;
    const content = text.textContent || '';
    const size = Number(text.getAttribute('font-size'));
    const targetWidth = Number(text.getAttribute('textLength'));
    const path = font.getPath(content, 0, 0, size);
    const bounds = path.getBoundingBox();
    const scale = targetWidth / Math.max(bounds.x2 - bounds.x1, .001);
    const x = Number(text.getAttribute('x')) - (text.getAttribute('text-anchor') === 'middle' ? targetWidth / 2 : 0);
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    node.setAttribute('d', path.toPathData(5));
    node.setAttribute('fill', text.getAttribute('fill') || '#000000');
    node.setAttribute('transform', `translate(${x} ${text.getAttribute('y')}) scale(${scale} 1) translate(${-bounds.x1} 0)`);
    text.replaceWith(node);
  }
  const metadata = document.createElementNS('http://www.w3.org/2000/svg', 'metadata');
  if (texts.length) {
    const response = await fetch('/licenses/lucide.txt');
    if (!response.ok) throw new Error('Impossibile completare lo SVG. Riprova.');
    metadata.textContent = `3Degree — diametro ${sizeMm} mm, scala 1:1. Simboli Lucide:\n${await response.text()}`;
  } else {
    metadata.textContent = `3Degree — diametro ${sizeMm} mm, scala 1:1. Grafica convertita in tracciati SVG.`;
  }
  copy.prepend(metadata);
  copy.querySelectorAll('[data-font], [data-emphasis]').forEach(el => { el.removeAttribute('data-font'); el.removeAttribute('data-emphasis'); });
  return new XMLSerializer().serializeToString(copy);
}
