import fs from "node:fs";
import { normalizeCatalog } from "./normalize-palette.mjs";
const products = normalizeCatalog(
  JSON.parse(fs.readFileSync("src/lib/products.json", "utf8"))
);
fs.writeFileSync(
  "src/lib/products.json",
  JSON.stringify(products, null, 2) + "\n"
);
for (const p of products.filter((p) => p.kind !== "cap"))
  for (const file of [p.model, p.openModel]) {
    const path = "public" + file,
      b = fs.readFileSync(path),
      len = b.readUInt32LE(12),
      j = JSON.parse(b.subarray(20, 20 + len).toString()),
      bin = Buffer.from(b.subarray(28 + len));
    for (const mesh of j.meshes)
      for (const primitive of mesh.primitives) {
        const index = primitive.attributes.COLOR_0;
        if (index === undefined) continue;
        const a = j.accessors[index],
          v = j.bufferViews[a.bufferView];
        if (a.componentType !== 5121)
          throw new Error("Expected normalized byte vertex colors");
        const offset = (v.byteOffset || 0) + (a.byteOffset || 0),
          stride = v.byteStride || 4;
        const rgb = /chip/i.test(mesh.name)
          ? [250, 204, 21]
          : bin[offset] > bin[offset + 1] * 1.5
          ? [220, 38, 38]
          : [34, 34, 34];
        for (let i = 0; i < a.count; i++)
          for (let k = 0; k < 3; k++) bin[offset + i * stride + k] = rgb[k];
        a.min = [...rgb, 255];
        a.max = [...rgb, 255];
      }
    const json = Buffer.from(JSON.stringify(j)),
      padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32);
    json.copy(padded);
    const header = Buffer.alloc(20);
    header.write("glTF");
    header.writeUInt32LE(2, 4);
    header.writeUInt32LE(28 + padded.length + bin.length, 8);
    header.writeUInt32LE(padded.length, 12);
    header.writeUInt32LE(0x4e4f534a, 16);
    const binHeader = Buffer.alloc(8);
    binHeader.writeUInt32LE(bin.length, 0);
    binHeader.writeUInt32LE(0x004e4942, 4);
    fs.writeFileSync(path, Buffer.concat([header, padded, binHeader, bin]));
  }
for (const file of ["src/components/cap-configurator.tsx"]) {
  let code = fs.readFileSync(file, "utf8");
  code = code
    .replaceAll("${label} ${preset}", "${label} ${filamentName(preset)}")
    .replaceAll("${color}`", "${filamentName(color)}`");
  fs.writeFileSync(file, code);
}
console.log("Normalized all presets and twelve GLBs to the printable palette.");
