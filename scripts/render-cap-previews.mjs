// Software z-buffer renderer of the real CAD triangles; no browser needed.
import fs from "node:fs";
import sharp from "sharp";
import opentype from "opentype.js";
const products = JSON.parse(fs.readFileSync("src/lib/products.json", "utf8"));
const meshes = JSON.parse(
  fs.readFileSync("public/models/tocco-meshes.json", "utf8")
);
const font = opentype.loadSync("public/fonts/great-vibes-400.woff");
const W = 2790,
  H = 2130,
  s = 24,
  ox = W / 2,
  oy = 1650;
const project = ([x, y, z]) => [
  ox + s * (0.8 * x + 0.6 * y),
  oy + s * (0.36 * x - 0.48 * y - 0.8 * z),
  0.48 * x - 0.64 * y + 0.6 * z,
];
for (const p of products.filter((p) => p.kind === "cap")) {
  const pixels = Buffer.alloc(W * H * 3);
  const zbuf = new Float32Array(W * H).fill(-Infinity);
  for (let i = 0; i < W * H; i++) {
    pixels[i * 3] = 240;
    pixels[i * 3 + 1] = 239;
    pixels[i * 3 + 2] = 237;
  }
  meshes.forEach((mesh, m) => {
    const a = mesh.attributes.position.array,
      indices = mesh.index.array,
      normals = mesh.attributes.normal?.array;
    const hex =
      m === 1
        ? p.preset.middleColor
        : m === 3
        ? p.preset.lineColor
        : p.preset.structureColor;
    const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    for (let i = 0; i < indices.length; i += 3) {
      const ids = indices.slice(i, i + 3),
        points = ids.map((k) => project(a.slice(k * 3, k * 3 + 3)));
      const [A, B, C] = points;
      const den = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
      if (Math.abs(den) < 1e-8) continue;
      const n = normals
        ? ids
            .map((k) => normals.slice(k * 3, k * 3 + 3))
            .reduce((v, n) => v.map((x, j) => x + n[j]), [0, 0, 0])
        : [0, 0, 1];
      const shade =
        0.4 +
        0.6 *
          Math.max(
            0,
            (-0.2 * n[0] - 0.4 * n[1] + 0.89 * n[2]) / (Math.hypot(...n) || 1)
          );
      const color = rgb.map((c) => Math.min(255, Math.round(12 + c * shade)));
      const minY = Math.max(0, Math.floor(Math.min(points[0][1], points[1][1], points[2][1])));
      const maxY = Math.min(H - 1, Math.ceil(Math.max(points[0][1], points[1][1], points[2][1])));
      const minX = Math.max(0, Math.floor(Math.min(points[0][0], points[1][0], points[2][0])));
      const maxX = Math.min(W - 1, Math.ceil(Math.max(points[0][0], points[1][0], points[2][0])));
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const u =
            ((B[1] - C[1]) * (x - C[0]) + (C[0] - B[0]) * (y - C[1])) / den;
          const v =
            ((C[1] - A[1]) * (x - C[0]) + (A[0] - C[0]) * (y - C[1])) / den;
          const w = 1 - u - v;
          if (u < 0 || v < 0 || w < 0) continue;
          const z = u * A[2] + v * B[2] + w * C[2],
            idx = y * W + x;
          if (z <= zbuf[idx]) continue;
          zbuf[idx] = z;
          for (let c = 0; c < 3; c++) pixels[idx * 3 + c] = color[c];
        }
      }
    }
  });
  let output = sharp(pixels, { raw: { width: W, height: H, channels: 3 } });
  if (p.preset.text) {
    const box = font.getPath(p.preset.text, 0, 0, 11).getBoundingBox();
    const path = font
      .getPath(
        p.preset.text,
        -(box.x1 + box.x2) / 2,
        -(box.y1 + box.y2) / 2,
        11
      )
      .toPathData(2);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><path d="${path}" fill="${
      p.preset.textColor
    }" transform="matrix(${s * 0.8} ${s * 0.36} ${-s * 0.6} ${s * 0.48} ${ox} ${
      oy - s * 0.8 * 37.05
    })"/></svg>`;
    output = output.composite([{ input: Buffer.from(svg) }]);
  }
  const pngBuffer = await output.png().toBuffer();
  const file1x = "public" + p.image;
  const file2x = "public" + p.image.replace(/\.webp$/, "@2x.webp");
  await sharp(pngBuffer)
    .resize(930, 710, { kernel: "lanczos3" })
    .webp({ quality: 90, effort: 4 })
    .toFile(file1x);
  await sharp(pngBuffer)
    .resize(1860, 1420, { kernel: "lanczos3" })
    .webp({ quality: 92, effort: 4 })
    .toFile(file2x);
  if (fs.existsSync("out/products")) {
    fs.copyFileSync(file1x, "out" + p.image);
    fs.copyFileSync(file2x, "out" + p.image.replace(/\.webp$/, "@2x.webp"));
  }
  p.dimensions = [65, 65, 37];
}
fs.writeFileSync(
  "src/lib/products.json",
  JSON.stringify(products, null, 2) + "\n"
);
console.log("Rendered eleven CAD previews with depth testing.");
