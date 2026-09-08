import fs from "node:fs";
const palette = JSON.parse(
  fs.readFileSync(
    new URL("../src/lib/filament-palette.json", import.meta.url),
    "utf8"
  )
);
const legacy = {
  "#000000": "#222222",
  "#27292a": "#222222",
  "#111827": "#222222",
  "#bd4039": "#dc2626",
  "#7f1d1d": "#dc2626",
  "#f8fafc": "#ffffff",
  "#fef3c7": "#ffffff",
  "#dcfce7": "#ffffff",
  "#dbeafe": "#ffffff",
  "#1e3a8a": "#2458b8",
  "#064e3b": "#218c45",
  "#0f766e": "#218c45",
  "#5eead4": "#218c45",
  "#4c1d95": "#803fa1",
  "#c084fc": "#803fa1",
  "#44403c": "#808080",
  "#f59e0b": "#facc15",
  "#d3af56": "#facc15",
};
export function printableColor(hex) {
  hex = hex.toLowerCase();
  if (legacy[hex]) return legacy[hex];
  if (palette.some((p) => p.hex === hex)) return hex;
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const input = rgb(hex);
  return [...palette].sort((a, b) => {
    const distance = (p) =>
      rgb(p.hex).reduce((sum, c, i) => sum + (c - input[i]) ** 2, 0);
    return distance(a) - distance(b);
  })[0].hex;
}
export function normalizeCatalog(products) {
  for (const p of products)
    if (p.preset)
      for (const key of [
        "structureColor",
        "middleColor",
        "lineColor",
        "textColor",
      ])
        p.preset[key] = printableColor(p.preset[key]);
  return products;
}
