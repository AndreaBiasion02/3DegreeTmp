import { decode } from 'fast-png';
import { traceComposition, tracerOptions } from '../src/lib/coaster-tracing.mjs';

const MAX_PNG_BYTES = 8_000_000;

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

/** Trace the entire composition; uniformly fit its canvas to the printable disk. */
export async function vectorizeCoasterComposition(base64, colorMode = 'mono') {
  return traceComposition(decode(decodeBase64(base64)), tracePixels, colorMode);
}
