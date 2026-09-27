import { decode } from 'fast-png';
import { getPathBounds, transformPath } from '../src/lib/coaster-art.mjs';

const MAX_TRACE_SIZE = 1024;
const MAX_PNG_BYTES = 8_000_000;
const MAX_PATHS = 100;
const MAX_PATH_LENGTH = 15000;
const MAX_TOTAL_PATH_LENGTH = 120000;
const tracerOptions = {
  clustering: 'bw', mode: 'spline',
  cornerThreshold: 90, lengthThreshold: 2, simplify: 1,
};

async function tracePixels(mask) {
  if (typeof process !== 'undefined' && process.versions?.node) {
    // Local tests use the package's Node wrapper; Workers need a precompiled Wasm import.
    const nodePackage = ['@visioncortex', 'vtracer'].join('/');
    const { default: tracer } = await import(nodePackage);
    return tracer.convertPixels(mask.data, mask.width, mask.height, tracerOptions);
  }
  const { vectorize_rgba } = await import('./vtracer-worker.mjs');
  return vectorize_rgba(mask.data, mask.width, mask.height, tracerOptions);
}

function decodeBase64(base64) {
  if (typeof base64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length > MAX_PNG_BYTES * 4 / 3 + 4) {
    throw new Error('Invalid image data');
  }
  const binary = atob(base64);
  if (binary.length > MAX_PNG_BYTES) throw new Error('Image too large');
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function traceMask(image) {
  const { width, height, data, channels, depth } = image;
  if (depth !== 8 || channels < 3 || width < 256 || height < 256 || width > 4096 || height > 4096) {
    throw new Error('Unsupported image dimensions');
  }
  const traceSize = Math.min(MAX_TRACE_SIZE, width, height);
  const rgba = new Uint8ClampedArray(traceSize * traceSize * 4);
  let darkPixels = 0;
  for (let y = 0; y < traceSize; y++) for (let x = 0; x < traceSize; x++) {
    const sx = Math.min(width - 1, Math.floor((x + .5) * width / traceSize));
    const sy = Math.min(height - 1, Math.floor((y + .5) * height / traceSize));
    const source = (sy * width + sx) * channels;
    const alpha = channels === 4 ? data[source + 3] / 255 : 1;
    const luminance = (data[source] * .2126 + data[source + 1] * .7152 + data[source + 2] * .0722) / 255;
    const dark = alpha * (1 - luminance) >= .45;
    const target = (y * traceSize + x) * 4;
    const value = dark ? 0 : 255;
    rgba[target] = rgba[target + 1] = rgba[target + 2] = value;
    rgba[target + 3] = 255;
    darkPixels += dark ? 1 : 0;
  }
  const coverage = darkPixels / (traceSize * traceSize);
  if (coverage < .005 || coverage > .7) throw new Error('Image has unsuitable ink coverage');
  return { width: traceSize, height: traceSize, data: rgba };
}

/** Trace the entire composition; uniformly fit its canvas to the printable disk. */
export async function vectorizeCoasterComposition(base64) {
  const mask = traceMask(decode(decodeBase64(base64)));
  const svg = await tracePixels(mask);
  const sourcePaths = [...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"[^>]*fill="#000000"[^>]*\/?\s*>/g)]
    .map(match => match[1].trim());
  if (!sourcePaths.length || sourcePaths.length > MAX_PATHS) throw new Error('Image has too many separate details');
  const paths = sourcePaths.map(d => ({
    d: transformPath(d, 2, 1, 96 / mask.width, 0, 0).trim(),
    fill: true, strokeWidth: 0, role: 'foreground',
  }));
  const totalLength = paths.reduce((sum, path) => sum + path.d.length, 0);
  if (totalLength > MAX_TOTAL_PATH_LENGTH || paths.some(path => path.d.length > MAX_PATH_LENGTH || !getPathBounds(path.d))) {
    throw new Error('Image is too detailed for a printable SVG');
  }
  return paths;
}
