"use client";

import opentype from "opentype.js";

const MAX_LOGO_FILE_SIZE = 512 * 1024;
const MAX_LOGO_CANVAS_SIDE = 768;
const MAX_LOGO_MASK_DATA_URL_LENGTH = 1_200_000;
const CAP_TEXTURE_SIZE = 1024;
const CAP_SURFACE_SIZE = 3.2;
const CAP_SIZE_MM = 65;
const BAND_OUTER_SIZE_MM = 55;
const BAND_THICKNESS_MM = 2;
const ACCEPTED_LOGO_TYPES = new Set(["image/svg+xml"]);

export type VectorLogoPath = {
  d: string;
  matrix: [number, number, number, number, number, number];
};

export type PreparedLogoMask = {
  aspectRatio: number;
  maskDataUrl: string;
  previewDataUrl: string;
  sourceName: string;
  vectorHeight: number;
  vectorPaths: VectorLogoPath[];
  vectorWidth: number;
  vectorX: number;
  vectorY: number;
};

export type CapSurfaceTextureInput = {
  structureColor: string;
  textItems: Array<{
    text: string;
    fontFamily: string;
    fontAssetUrl: string;
    color: string;
    scale: number;
    x: number;
    y: number;
  }>;
  logo: {
    previewDataUrl: string;
    color: string;
    scale: number;
    x: number;
    y: number;
    aspectRatio: number;
    vectorHeight: number;
    vectorPaths: VectorLogoPath[];
    vectorWidth: number;
    vectorX: number;
    vectorY: number;
  } | null;
};

const loadedFontAssets = new Map<string, Promise<void>>();
const parsedFontAssets = new Map<string, Promise<opentype.Font>>();

async function ensureCanvasFont(family: string, source: string) {
  const key = `${family}:${source}`;
  loadedFontAssets.set(
    key,
    loadedFontAssets.get(key) ??
      new FontFace(family, `url("${source}")`).load().then((font) => {
        document.fonts.add(font);
      })
  );

  await loadedFontAssets.get(key);
}

async function loadVectorFont(source: string) {
  parsedFontAssets.set(
    source,
    parsedFontAssets.get(source) ??
      fetch(source)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Impossibile caricare il font vettoriale.");
          }
          return response.arrayBuffer();
        })
        .then((buffer) => opentype.parse(buffer))
  );

  return parsedFontAssets.get(source)!;
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    if (context.measureText(word).width > maxWidth) {
      if (current) {
        lines.push(current);
        current = "";
      }

      let segment = "";
      Array.from(word).forEach((character) => {
        const candidate = `${segment}${character}`;
        if (segment && context.measureText(candidate).width > maxWidth) {
          lines.push(segment);
          segment = character;
        } else {
          segment = candidate;
        }
      });
      current = segment;
      return;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (current && context.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
      return;
    }
    current = candidate;
  });

  if (current) {
    lines.push(current);
  }

  const startY = centerY - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => {
    context.fillText(line, centerX, startY + index * lineHeight);
  });
}

export async function createCapSurfaceTexture(input: CapSurfaceTextureInput) {
  const canvas = document.createElement("canvas");
  canvas.width = CAP_TEXTURE_SIZE;
  canvas.height = CAP_TEXTURE_SIZE;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Il browser non supporta la texture del tappo.");
  }

  context.fillStyle = input.structureColor;
  context.fillRect(0, 0, CAP_TEXTURE_SIZE, CAP_TEXTURE_SIZE);
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (const item of input.textItems) {
    if (!item.text.trim()) {
      continue;
    }

    await ensureCanvasFont(item.fontFamily, item.fontAssetUrl);
    const fontSize = (item.scale / CAP_SURFACE_SIZE) * CAP_TEXTURE_SIZE;
    context.font = `${fontSize}px "${item.fontFamily}"`;
    context.fillStyle = item.color;
    const text = item.text.trim();
    const metrics = context.measureText(text);
    const inkCenterX =
      (-metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight) / 2;
    const inkCenterY =
      (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
    const targetCenterX =
      CAP_TEXTURE_SIZE / 2 + (item.x / CAP_SURFACE_SIZE) * CAP_TEXTURE_SIZE;
    const targetCenterY =
      CAP_TEXTURE_SIZE / 2 - (item.y / CAP_SURFACE_SIZE) * CAP_TEXTURE_SIZE;

    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    context.fillText(
      text,
      targetCenterX - inkCenterX,
      targetCenterY + inkCenterY
    );
  }

  if (input.logo) {
    const image = await loadImage(input.logo.previewDataUrl);
    const height = (input.logo.scale / CAP_SURFACE_SIZE) * CAP_TEXTURE_SIZE;
    const width = height * input.logo.aspectRatio;
    const x =
      CAP_TEXTURE_SIZE / 2 +
      (input.logo.x / CAP_SURFACE_SIZE) * CAP_TEXTURE_SIZE -
      width / 2;
    const y =
      CAP_TEXTURE_SIZE / 2 -
      (input.logo.y / CAP_SURFACE_SIZE) * CAP_TEXTURE_SIZE -
      height / 2;
    const logoCanvas = document.createElement("canvas");
    logoCanvas.width = Math.max(1, Math.ceil(width));
    logoCanvas.height = Math.max(1, Math.ceil(height));
    const logoContext = logoCanvas.getContext("2d");

    if (!logoContext) {
      throw new Error("Il browser non supporta la texture del logo.");
    }

    logoContext.drawImage(image, 0, 0, logoCanvas.width, logoCanvas.height);
    logoContext.globalCompositeOperation = "source-in";
    logoContext.fillStyle = input.logo.color;
    logoContext.fillRect(0, 0, logoCanvas.width, logoCanvas.height);
    context.drawImage(logoCanvas, x, y, width, height);
  }

  // Send the same top-down composition shown by the 2D configurator. Applying
  // another transform here would make the production texture diverge from it.
  return canvas.toDataURL("image/png");
}

function multiplyMatrices(
  left: VectorLogoPath["matrix"],
  right: VectorLogoPath["matrix"]
): VectorLogoPath["matrix"] {
  const [a1, b1, c1, d1, e1, f1] = left;
  const [a2, b2, c2, d2, e2, f2] = right;

  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

function formatMatrix(matrix: VectorLogoPath["matrix"]) {
  return matrix.map((value) => Number(value.toFixed(6))).join(" ");
}

function escapeSvgAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function createCapSurfaceVector(input: CapSurfaceTextureInput) {
  const paths: string[] = [];

  for (const item of input.textItems) {
    const text = item.text.trim();
    if (!text) {
      continue;
    }

    const font = await loadVectorFont(item.fontAssetUrl);
    const fontSize = (item.scale / CAP_SURFACE_SIZE) * CAP_SIZE_MM;
    const sourcePath = font.getPath(text, 0, 0, fontSize);
    const bounds = sourcePath.getBoundingBox();
    const centerX = CAP_SIZE_MM / 2 + (item.x / CAP_SURFACE_SIZE) * CAP_SIZE_MM;
    const centerY = CAP_SIZE_MM / 2 - (item.y / CAP_SURFACE_SIZE) * CAP_SIZE_MM;
    const translatedPath = font.getPath(
      text,
      centerX - (bounds.x1 + bounds.x2) / 2,
      centerY - (bounds.y1 + bounds.y2) / 2,
      fontSize
    );
    const d = translatedPath.toPathData(5);

    if (d) {
      paths.push(
        `<path data-color="${item.color.toLowerCase()}" d="${escapeSvgAttribute(
          d
        )}" transform="matrix(1 0 0 1 0 0)"/>`
      );
    }
  }

  if (input.logo) {
    const height = (input.logo.scale / CAP_SURFACE_SIZE) * CAP_SIZE_MM;
    const width = height * input.logo.aspectRatio;
    const centerX =
      CAP_SIZE_MM / 2 + (input.logo.x / CAP_SURFACE_SIZE) * CAP_SIZE_MM;
    const centerY =
      CAP_SIZE_MM / 2 - (input.logo.y / CAP_SURFACE_SIZE) * CAP_SIZE_MM;
    const placement: VectorLogoPath["matrix"] = [
      width / input.logo.vectorWidth,
      0,
      0,
      height / input.logo.vectorHeight,
      centerX -
        width / 2 -
        (input.logo.vectorX * width) / input.logo.vectorWidth,
      centerY -
        height / 2 -
        (input.logo.vectorY * height) / input.logo.vectorHeight,
    ];

    input.logo.vectorPaths.forEach((path) => {
      paths.push(
        `<path data-color="${input.logo!.color.toLowerCase()}" d="${escapeSvgAttribute(
          path.d
        )}" transform="matrix(${formatMatrix(
          multiplyMatrices(placement, path.matrix)
        )})"/>`
      );
    });
  }

  if (!paths.length) {
    return null;
  }

  const svg = `<svg viewBox="0 0 65 65" xmlns="http://www.w3.org/2000/svg">${paths.join(
    ""
  )}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export async function createCapSurfacePreview(
  textureDataUrl: string,
  lineColor: string
) {
  const image = await loadImage(textureDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = CAP_TEXTURE_SIZE;
  canvas.height = CAP_TEXTURE_SIZE;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Il browser non supporta l'anteprima del tappo.");
  }

  context.drawImage(image, 0, 0, CAP_TEXTURE_SIZE, CAP_TEXTURE_SIZE);

  const outerInset =
    (((CAP_SIZE_MM - BAND_OUTER_SIZE_MM) / CAP_SIZE_MM) * CAP_TEXTURE_SIZE) / 2;
  const outerSize = (BAND_OUTER_SIZE_MM / CAP_SIZE_MM) * CAP_TEXTURE_SIZE;
  const thickness = (BAND_THICKNESS_MM / CAP_SIZE_MM) * CAP_TEXTURE_SIZE;
  const innerSize = outerSize - thickness * 2;
  const oppositeEdge = outerInset + outerSize - thickness;

  context.fillStyle = lineColor;
  context.fillRect(outerInset, outerInset, outerSize, thickness);
  context.fillRect(outerInset, oppositeEdge, outerSize, thickness);
  context.fillRect(outerInset, outerInset + thickness, thickness, innerSize);
  context.fillRect(oppositeEdge, outerInset + thickness, thickness, innerSize);

  return canvas.toDataURL("image/jpeg", 0.9);
}

type Rgb = [number, number, number];

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Impossibile leggere il logo caricato."));
    image.src = source;
  });
}

function colorDistance(left: Rgb, right: Rgb) {
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
}

function getUniformBorderColor(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): Rgb | null {
  const cornerOffsets = [
    0,
    Math.max(0, width - 1),
    Math.max(0, height - 1) * width,
    Math.max(0, height - 1) * width + Math.max(0, width - 1),
  ];
  const samples = cornerOffsets.flatMap((pixelIndex) => {
    const offset = pixelIndex * 4;
    return pixels[offset + 3] > 32
      ? [[pixels[offset], pixels[offset + 1], pixels[offset + 2]] as Rgb]
      : [];
  });

  if (samples.length < 3) {
    return null;
  }

  const average: Rgb = [0, 0, 0];
  samples.forEach((sample) => {
    average[0] += sample[0] / samples.length;
    average[1] += sample[1] / samples.length;
    average[2] += sample[2] / samples.length;
  });

  if (!samples.every((sample) => colorDistance(sample, average) <= 48)) {
    return null;
  }

  let borderSamples = 0;
  let matchingBorderSamples = 0;
  const sampleBorderPixel = (pixelIndex: number) => {
    const offset = pixelIndex * 4;
    if (pixels[offset + 3] <= 32) {
      return;
    }

    borderSamples += 1;
    if (
      colorDistance(
        [pixels[offset], pixels[offset + 1], pixels[offset + 2]],
        average
      ) <= 56
    ) {
      matchingBorderSamples += 1;
    }
  };

  for (let x = 0; x < width; x += 1) {
    sampleBorderPixel(x);
    if (height > 1) {
      sampleBorderPixel((height - 1) * width + x);
    }
  }
  for (let y = 1; y < height - 1; y += 1) {
    sampleBorderPixel(y * width);
    if (width > 1) {
      sampleBorderPixel(y * width + width - 1);
    }
  }

  return borderSamples > 0 && matchingBorderSamples / borderSamples >= 0.5
    ? average
    : null;
}

function normalizedColorContrast(color: Rgb, background: Rgb) {
  return Math.max(
    ...color.map((channel, index) => {
      const backgroundChannel = background[index];
      const availableRange = Math.max(
        backgroundChannel,
        255 - backgroundChannel
      );
      return availableRange > 0
        ? Math.abs(channel - backgroundChannel) / availableRange
        : 0;
    })
  );
}

function trimTransparentBorder(source: ImageData) {
  const { data, width, height } = source;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= 8) {
        continue;
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error(
      "Il logo non contiene elementi visibili dopo la rimozione dello sfondo."
    );
  }

  const padding = 2;
  const contentWidth = maxX - minX + 1;
  const contentHeight = maxY - minY + 1;
  const trimmedWidth = contentWidth + padding * 2;
  const trimmedHeight = contentHeight + padding * 2;
  const trimmed = new ImageData(trimmedWidth, trimmedHeight);

  for (let y = 0; y < contentHeight; y += 1) {
    const sourceOffset = ((minY + y) * width + minX) * 4;
    const targetOffset = ((y + padding) * trimmedWidth + padding) * 4;
    trimmed.data.set(
      data.subarray(sourceOffset, sourceOffset + contentWidth * 4),
      targetOffset
    );
  }

  return trimmed;
}

function removeUniformBackground(imageData: ImageData) {
  const { data, width, height } = imageData;
  const pixelCount = width * height;
  const minimumTransparentPixels = Math.min(
    pixelCount,
    Math.max(4, Math.ceil(pixelCount * 0.001))
  );
  let transparentPixels = 0;

  for (let offset = 3; offset < data.length; offset += 4) {
    if (data[offset] < 250) {
      transparentPixels += 1;
    }
  }

  const hasTransparency = transparentPixels >= minimumTransparentPixels;
  const backgroundColor = hasTransparency
    ? null
    : getUniformBorderColor(data, width, height);

  if (!backgroundColor && !hasTransparency) {
    throw new Error(
      "Lo sfondo non è uniforme. Carica un logo con sfondo trasparente o a tinta unita."
    );
  }

  let foregroundContrast = 0;
  if (backgroundColor) {
    for (let offset = 0; offset < data.length; offset += 4) {
      foregroundContrast = Math.max(
        foregroundContrast,
        normalizedColorContrast(
          [data[offset], data[offset + 1], data[offset + 2]],
          backgroundColor
        )
      );
    }

    if (foregroundContrast < 0.06) {
      throw new Error(
        "Il logo non è distinguibile dallo sfondo. Aumenta il contrasto dell'immagine."
      );
    }
  }

  let visiblePixels = 0;
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const offset = pixelIndex * 4;
    const sourceAlpha = data[offset + 3];
    let alpha = sourceAlpha;

    if (backgroundColor && sourceAlpha > 0) {
      const contrast = normalizedColorContrast(
        [data[offset], data[offset + 1], data[offset + 2]],
        backgroundColor
      );
      const noiseFloor = 0.02;
      const coverage = Math.min(
        1,
        Math.max(0, (contrast - noiseFloor) / (foregroundContrast - noiseFloor))
      );
      alpha = Math.round(sourceAlpha * coverage);
    }

    if (alpha <= 4) {
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 0;
      continue;
    }

    data[offset] = 255;
    data[offset + 1] = 255;
    data[offset + 2] = 255;
    data[offset + 3] = alpha;
    visiblePixels += 1;
  }

  if (visiblePixels < 8) {
    throw new Error(
      "Il logo non contiene elementi visibili dopo la rimozione dello sfondo."
    );
  }

  return trimTransparentBorder(imageData);
}

function createTransparentAlphaMask(source: ImageData) {
  const mask = new ImageData(source.width, source.height);

  for (let offset = 0; offset < source.data.length; offset += 4) {
    const value = source.data[offset + 3];
    mask.data[offset] = value;
    mask.data[offset + 1] = value;
    mask.data[offset + 2] = value;
    mask.data[offset + 3] = value;
  }

  return mask;
}

function parseSvgNumber(value: string | null, fallback = 0) {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

function shapeToPathData(element: SVGGeometryElement) {
  const tagName = element.tagName.toLowerCase();
  if (tagName === "path") {
    return element.getAttribute("d")?.trim() ?? "";
  }
  if (tagName === "circle") {
    const cx = parseSvgNumber(element.getAttribute("cx"));
    const cy = parseSvgNumber(element.getAttribute("cy"));
    const radius = parseSvgNumber(element.getAttribute("r"));
    return radius > 0
      ? `M ${cx - radius} ${cy} A ${radius} ${radius} 0 1 0 ${
          cx + radius
        } ${cy} A ${radius} ${radius} 0 1 0 ${cx - radius} ${cy} Z`
      : "";
  }
  if (tagName === "ellipse") {
    const cx = parseSvgNumber(element.getAttribute("cx"));
    const cy = parseSvgNumber(element.getAttribute("cy"));
    const rx = parseSvgNumber(element.getAttribute("rx"));
    const ry = parseSvgNumber(element.getAttribute("ry"));
    return rx > 0 && ry > 0
      ? `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${
          cx + rx
        } ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`
      : "";
  }
  if (tagName === "rect") {
    const x = parseSvgNumber(element.getAttribute("x"));
    const y = parseSvgNumber(element.getAttribute("y"));
    const width = parseSvgNumber(element.getAttribute("width"));
    const height = parseSvgNumber(element.getAttribute("height"));
    const radius = Math.min(
      Math.max(
        parseSvgNumber(
          element.getAttribute("rx"),
          parseSvgNumber(element.getAttribute("ry"))
        ),
        0
      ),
      width / 2,
      height / 2
    );
    if (width <= 0 || height <= 0) return "";
    if (!radius) {
      return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
    }
    return `M ${x + radius} ${y} H ${
      x + width - radius
    } A ${radius} ${radius} 0 0 1 ${x + width} ${y + radius} V ${
      y + height - radius
    } A ${radius} ${radius} 0 0 1 ${x + width - radius} ${y + height} H ${
      x + radius
    } A ${radius} ${radius} 0 0 1 ${x} ${y + height - radius} V ${
      y + radius
    } A ${radius} ${radius} 0 0 1 ${x + radius} ${y} Z`;
  }
  if (tagName === "polygon" || tagName === "polyline") {
    const coordinates = (element.getAttribute("points") ?? "").match(
      /[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi
    );
    if (!coordinates || coordinates.length < 6 || coordinates.length % 2) {
      return "";
    }
    const points: string[] = [];
    for (let index = 0; index < coordinates.length; index += 2) {
      points.push(`${coordinates[index]} ${coordinates[index + 1]}`);
    }
    return `M ${points.join(" L ")} Z`;
  }
  return "";
}

function extractVectorLogo(source: string) {
  const parsed = new DOMParser().parseFromString(source, "image/svg+xml");
  if (parsed.querySelector("parsererror")) {
    throw new Error("Il logo SVG non è valido.");
  }

  const sourceRoot = parsed.documentElement;
  const viewBox = (sourceRoot.getAttribute("viewBox") ?? "")
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    sourceRoot.tagName.toLowerCase() !== "svg" ||
    viewBox.length !== 4 ||
    !viewBox.every(Number.isFinite) ||
    viewBox[2] <= 0 ||
    viewBox[3] <= 0
  ) {
    throw new Error("Il logo SVG deve avere un viewBox valido.");
  }
  if (
    sourceRoot.querySelector(
      "script, foreignObject, image, text, use, iframe, object, embed"
    )
  ) {
    throw new Error(
      "Il logo SVG deve contenere solo forme e tracciati vettoriali espansi."
    );
  }
  for (const element of Array.from(sourceRoot.querySelectorAll("*"))) {
    for (const attribute of Array.from(element.attributes)) {
      if (
        attribute.name.toLowerCase().startsWith("on") ||
        /(?:href|url\s*\()/i.test(`${attribute.name}=${attribute.value}`)
      ) {
        throw new Error("Il logo SVG contiene riferimenti non consentiti.");
      }
    }
  }

  const root = document.importNode(
    sourceRoot,
    true
  ) as unknown as SVGSVGElement;
  root.setAttribute("width", String(viewBox[2]));
  root.setAttribute("height", String(viewBox[3]));
  root.style.position = "fixed";
  root.style.left = "-100000px";
  root.style.top = "0";
  root.style.opacity = "0";
  root.style.pointerEvents = "none";
  document.body.appendChild(root);

  try {
    const vectorPaths: VectorLogoPath[] = [];
    const rootRect = root.getBoundingClientRect();
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    const geometries = root.querySelectorAll<SVGGeometryElement>(
      "path, rect, circle, ellipse, polygon, polyline"
    );

    geometries.forEach((geometry) => {
      if (geometry.closest("defs, clipPath, mask, symbol")) return;
      const style = window.getComputedStyle(geometry);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number(style.opacity) === 0
      ) {
        return;
      }
      if (style.fill === "none" && style.stroke !== "none") {
        throw new Error(
          "Converti i contorni del logo SVG in tracciati pieni prima del caricamento."
        );
      }
      if (style.fill === "none") return;

      const d = shapeToPathData(geometry);
      const matrix = geometry.getCTM();
      if (!d || !matrix) return;
      if (!/[zZ]/.test(d)) {
        throw new Error("Tutti i tracciati del logo SVG devono essere chiusi.");
      }
      vectorPaths.push({
        d,
        matrix: [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f],
      });
      const rect = geometry.getBoundingClientRect();
      minX = Math.min(minX, rect.left - rootRect.left);
      minY = Math.min(minY, rect.top - rootRect.top);
      maxX = Math.max(maxX, rect.right - rootRect.left);
      maxY = Math.max(maxY, rect.bottom - rootRect.top);
    });

    if (
      !vectorPaths.length ||
      ![minX, minY, maxX, maxY].every(Number.isFinite) ||
      maxX <= minX ||
      maxY <= minY
    ) {
      throw new Error("Il logo SVG non contiene tracciati pieni utilizzabili.");
    }
    if (vectorPaths.length > 120) {
      throw new Error(
        "Il logo SVG contiene troppi tracciati. Unisci le forme prima del caricamento."
      );
    }

    return {
      vectorHeight: maxY - minY,
      vectorPaths,
      vectorWidth: maxX - minX,
      vectorX: minX,
      vectorY: minY,
    };
  } finally {
    root.remove();
  }
}

export async function prepareLogoMask(file: File): Promise<PreparedLogoMask> {
  if (!ACCEPTED_LOGO_TYPES.has(file.type) || file.size > MAX_LOGO_FILE_SIZE) {
    throw new Error("Carica un logo SVG vettoriale fino a 512 KB.");
  }

  const vectorLogo = extractVectorLogo(await file.text());
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;

    if (!sourceWidth || !sourceHeight) {
      throw new Error("Il logo caricato non ha dimensioni valide.");
    }

    const scale = Math.min(
      1,
      MAX_LOGO_CANVAS_SIDE / Math.max(sourceWidth, sourceHeight)
    );
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      throw new Error("Il browser non supporta l'elaborazione del logo.");
    }

    context.drawImage(image, 0, 0, width, height);
    const imageData = removeUniformBackground(
      context.getImageData(0, 0, width, height)
    );
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    context.putImageData(imageData, 0, 0);

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = imageData.width;
    maskCanvas.height = imageData.height;
    const maskContext = maskCanvas.getContext("2d");

    if (!maskContext) {
      throw new Error("Il browser non supporta la maschera del logo.");
    }

    maskContext.putImageData(createTransparentAlphaMask(imageData), 0, 0);
    const previewDataUrl = canvas.toDataURL("image/png");
    const maskDataUrl = maskCanvas.toDataURL("image/png");
    if (
      previewDataUrl.length > MAX_LOGO_MASK_DATA_URL_LENGTH ||
      maskDataUrl.length > MAX_LOGO_MASK_DATA_URL_LENGTH
    ) {
      throw new Error(
        "Il logo elaborato è troppo grande. Riduci i dettagli dell'immagine."
      );
    }

    return {
      maskDataUrl,
      previewDataUrl,
      aspectRatio: vectorLogo.vectorWidth / vectorLogo.vectorHeight,
      sourceName: file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120),
      ...vectorLogo,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
