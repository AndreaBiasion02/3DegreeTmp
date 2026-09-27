import { validateArtworks } from './coaster-art.mjs';
import { pathsFromTracedSvg, traceMask, tracerOptions } from './coaster-tracing.mjs';
import { filamentPalette } from './filament-colors';

const MAX_PNG_BYTES = 8_000_000;

export async function artworkFromGeneratedImage(base64: unknown, brief: string) {
  if (typeof base64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length > MAX_PNG_BYTES * 4 / 3 + 4) {
    throw new Error('Immagine generata non valida.');
  }
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  if (bytes.length > MAX_PNG_BYTES) throw new Error('Immagine generata troppo grande.');
  const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
  const { width, height } = bitmap;
  if (width < 256 || height < 256 || width > 4096 || height > 4096) {
    bitmap.close();
    throw new Error('Dimensioni immagine non valide.');
  }
  const size = Math.min(1024, width, height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas non disponibile.');
  context.drawImage(bitmap, 0, 0, size, size);
  bitmap.close();
  const imageData = context.getImageData(0, 0, size, size);
  const mask = traceMask({ width: size, height: size, data: imageData.data, channels: 4, depth: 8 });

  const { initializeVTracer, vectorize_rgba } = await import('./vtracer-browser.mjs');
  await initializeVTracer();
  const svg: string = vectorize_rgba(new Uint8Array(mask.data.buffer), mask.width, mask.height, tracerOptions);
  const paths = pathsFromTracedSvg(svg, mask.width);
  return validateArtworks([{ title: brief.trim().slice(0, 40), concept: 'Composizione originale da immagine',
    background: '#ffffff', foreground: '#222222', texts: [], paths, imageComposition: true }], filamentPalette)[0];
}
