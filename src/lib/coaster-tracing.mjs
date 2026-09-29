import { getPathBounds, transformPath } from './coaster-art.mjs';

const MAX_TRACE_SIZE = 1024;
const MAX_PATHS = 100;
const MAX_PATH_LENGTH = 15000;
const MAX_TOTAL_PATH_LENGTH = 120000;
export const COASTER_BORDER_RADIUS = 48 - 2 / 75 * 96; // ring centre, 2 mm from the 75 mm edge
const ringPath = `M ${50} ${49 - COASTER_BORDER_RADIUS} A ${COASTER_BORDER_RADIUS} ${COASTER_BORDER_RADIUS} 0 1 1 ${50} ${49 + COASTER_BORDER_RADIUS} A ${COASTER_BORDER_RADIUS} ${COASTER_BORDER_RADIUS} 0 1 1 ${50} ${49 - COASTER_BORDER_RADIUS} Z`;

export const tracerOptions = {
  clustering: 'bw', mode: 'spline',
  cornerThreshold: 90, lengthThreshold: 2, simplify: 1,
};

// Quantize the generated two-ink design before tracing. Antialiasing and near-colors
// never become extra filaments: masks are disjoint and exported by semantic role.
export function traceColorMasks(image) {
  const { width, height, data, channels, depth } = image;
  if (depth !== 8 || channels < 3 || width < 256 || height < 256 || width > 4096 || height > 4096) {
    throw new Error('Unsupported image dimensions');
  }
  const size = Math.min(MAX_TRACE_SIZE, width, height);
  const masks = ['foreground', 'accent'].map(role => ({ role, width: size, height: size, data: new Uint8ClampedArray(size * size * 4).fill(255), count: 0 }));
  const inks = [[34, 34, 34], [220, 38, 38], [255, 255, 255]];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const source = (Math.min(height - 1, Math.floor((y + .5) * height / size)) * width + Math.min(width - 1, Math.floor((x + .5) * width / size))) * channels;
    if (channels === 4 && data[source + 3] < 128) continue;
    const distances = inks.map(ink => ink.reduce((sum, value, channel) => sum + (data[source + channel] - value) ** 2, 0));
    const index = distances.indexOf(Math.min(...distances));
    if (index === 2) continue; // Ignore an opaque white background if returned by the model.
    const mask = masks[index];
    const target = (y * size + x) * 4;
    mask.data[target] = mask.data[target + 1] = mask.data[target + 2] = 0;
    mask.count++;
  }
  const coverage = masks.reduce((sum, mask) => sum + mask.count, 0) / (size * size);
  if (coverage < .005 || coverage > .7) throw new Error('Image has unsuitable ink coverage');
  return masks.filter(mask => mask.count >= size * size * .0001);
}

export async function traceComposition(image, trace, colorMode = 'mono') {
  const masks = colorMode === 'duotone' ? traceColorMasks(image) : [{ ...traceMask(image), role: 'foreground' }];
  const paths = [];
  for (const mask of masks) {
    const svg = await trace(mask);
    paths.push(...pathsFromTracedSvg(svg, mask.width).map(path => ({ ...path, role: mask.role })));
  }
  if (paths.length > MAX_PATHS || paths.reduce((sum, path) => sum + path.d.length, 0) > MAX_TOTAL_PATH_LENGTH) {
    throw new Error('Image is too detailed for a printable SVG');
  }
  // The model's circular border varies. Replace a detached near-circle with one
  // deterministic ring, then scale the lettering/illustration uniformly inside it.
  const borderIndex = paths.findIndex(path => {
    if (path.role !== 'foreground' || path.d.length > 1500) return false;
    // A traced outline is a donut (outer and inner contours). A filled round
    // illustration has one contour and must never be mistaken for the border.
    if ((path.d.match(/[Mm]/g) || []).length !== 2 || (path.d.match(/[Zz]/g) || []).length !== 2) return false;
    const b = getPathBounds(path.d);
    if (!b) return false;
    const w = b.maxX - b.minX, h = b.maxY - b.minY;
    return w > 60 && h > 60 && w / h > .85 && w / h < 1.15 &&
      Math.abs(b.centerX - 50) < 4.5 && Math.abs(b.centerY - 49) < 4.5;
  });
  if (borderIndex >= 0) {
    const border = paths.splice(borderIndex, 1)[0];
    const b = getPathBounds(border.d);
    const oldRadius = ((b.maxX - b.minX) + (b.maxY - b.minY)) / 4;
    const contentRadius = Math.max(0, ...paths.map(path => getPathBounds(path.d).maxRadius));
    const scale = Math.min(COASTER_BORDER_RADIUS / oldRadius, contentRadius ? (COASTER_BORDER_RADIUS - 3) / contentRadius : Infinity);
    const normalized = paths.map(path => ({ ...path, d: transformPath(path.d, 0, 0, scale) }));
    return [{ d: ringPath, fill: false, strokeWidth: 1.1, role: 'foreground' }, ...normalized];
  }
  // No ring: retain the model's open composition and fit every ink layer together.
  const radius = Math.max(...paths.map(path => getPathBounds(path.d).maxRadius));
  const scale = Math.min(1, COASTER_BORDER_RADIUS / radius);
  return scale < 1 ? paths.map(path => ({ ...path, d: transformPath(path.d, 0, 0, scale) })) : paths;
}

export function traceMask({ width, height, data, channels, depth }) {
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

export function pathsFromTracedSvg(svg, size) {
  const sourcePaths = [...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"[^>]*fill="#000000"[^>]*\/?\s*>/g)]
    .map(match => match[1].trim());
  if (!sourcePaths.length || sourcePaths.length > MAX_PATHS) throw new Error('Image has too many separate details');
  const paths = sourcePaths.map(d => ({
    d: transformPath(d, 2, 1, 96 / size, 0, 0).trim(),
    fill: true, strokeWidth: 0, role: 'foreground',
  }));
  const totalLength = paths.reduce((sum, path) => sum + path.d.length, 0);
  if (totalLength > MAX_TOTAL_PATH_LENGTH || paths.some(path => path.d.length > MAX_PATH_LENGTH || !getPathBounds(path.d))) {
    throw new Error('Image is too detailed for a printable SVG');
  }
  return paths;
}
