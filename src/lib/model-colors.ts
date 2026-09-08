export type ModelColors = { structure: string; accent: string };
import { filamentPalette } from "./filament-colors";
export const defaultColors: ModelColors = {
  structure: "#222222",
  accent: "#dc2626",
};
export const colorChoices = filamentPalette.map(
  (p) => [p.name, p.hex] as const
);
// Semantic part names survive both closed and open GLBs. The chip uses fixed PLA yellow.
export function colorRole(
  name: string,
  rgb?: number[]
): "structure" | "accent" | "fixed" {
  if (/chip/i.test(name)) return "fixed";
  if (rgb)
    return rgb[0] > rgb[1] * 1.5 && rgb[0] > rgb[2] * 1.5
      ? "accent"
      : "structure";
  return /cornice|euro|freccia|colonna|croce|bilancia|segnalibro|ingranaggio|simbolo|bordo|fascia|^10_DNA|anello/i.test(
    name
  )
    ? "accent"
    : "structure";
}
