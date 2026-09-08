import palette from "./filament-palette.json";
export const filamentPalette = palette;
export const filamentColors = palette.map((p) => p.hex);
export const filamentName = (hex: string) =>
  palette.find((p) => p.hex === hex)?.name ?? "Colore non disponibile";
