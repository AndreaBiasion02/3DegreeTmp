export type ModelColors = { structure: string; accent: string };
export const defaultColors: ModelColors = {
  structure: "#27292a",
  accent: "#bd4039",
};
export const colorChoices = [
  ["Nero", "#222222"],
  ["Bianco", "#f8fafc"],
  ["Rosso", "#bd4039"],
  ["Bordeaux", "#7f1d1d"],
  ["Blu", "#1e3a8a"],
  ["Verde", "#064e3b"],
  ["Viola", "#4c1d95"],
  ["Oro", "#d3af56"],
] as const;
// Semantic part names survive both closed and open GLBs. Gold details remain unchanged.
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
