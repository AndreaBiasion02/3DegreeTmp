import { fontFiles } from './coaster-design.mjs';

/** Export the same top-view artwork at physical size, with self-contained text outlines. */
export async function exportCoasterSvg(source: SVGSVGElement): Promise<string> {
  const opentype = await import('opentype.js');
  const target = (source.matches('[data-export-svg]')
    ? source
    : (source.querySelector('[data-export-svg]') as SVGSVGElement | null)) || source;
  const copy = target.cloneNode(true) as SVGSVGElement;
  copy.setAttribute('width', '70mm');
  copy.setAttribute('height', '70mm');
  copy.setAttribute('viewBox', '2 1 96 96');
  copy.removeAttribute('class');
  copy.removeAttribute('data-export-svg');
  copy.querySelectorAll('rect[width="465"], ellipse[cx="235"]').forEach(el => el.remove());
  const texts = [...copy.querySelectorAll('text')];
  const families = [...new Set(texts.map(t => t.getAttribute('data-font') as keyof typeof fontFiles))];
  const fonts = new Map(await Promise.all(families.map(async family => {
    const response = await fetch(fontFiles[family]);
    if (!response.ok) throw new Error('Impossibile caricare il carattere per lo SVG. Riprova.');
    return [family, opentype.parse(await response.arrayBuffer())] as const;
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
  const response = await fetch('/licenses/lucide.txt');
  if (!response.ok) throw new Error('Impossibile completare lo SVG. Riprova.');
  const metadata = document.createElementNS('http://www.w3.org/2000/svg', 'metadata');
  metadata.textContent = `3Degree — diametro 70 mm, scala 1:1. Simboli Lucide:\n${await response.text()}`;
  copy.prepend(metadata);
  copy.querySelectorAll('[data-font], [data-emphasis]').forEach(el => { el.removeAttribute('data-font'); el.removeAttribute('data-emphasis'); });
  return new XMLSerializer().serializeToString(copy);
}
