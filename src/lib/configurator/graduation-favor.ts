export type ConfiguratorTextItem = {
  id: string;
  text: string;
  fontKey: string;
  fontFamily: string;
  fontAssetUrl: string;
  color: string;
  scale: number;
  x: number;
  y: number;
};

export type ConfiguratorLogoItem = {
  id: string;
  sourceName: string;
  assetId?: string;
  color: string;
  scale: number;
  x: number;
  y: number;
  aspectRatio: number;
};

export type GraduationFavorTransientAssets = {
  previewDataUrl: string | null;
  logoMaskDataUrl: string | null;
  capTextureDataUrl: string | null;
  capVectorDataUrl: string | null;
};

export type GraduationFavorPayload = {
  modelVersion: string;
  cadSourceUrl: string;
  cadSourceFormat: "step";
  structureColor: string;
  lineColor: string;
  previewImageId?: string;
  capVectorAssetId?: string;
  surface: {
    mode: "composition";
    textItems: ConfiguratorTextItem[];
    logoItems: ConfiguratorLogoItem[];
    maxItems: number;
    maxCharactersPerText: number;
    reliefDepthMm: number;
    surfacePlane: "upper_cap_top";
  };
};

export type GraduationFavorSummary = {
  lineColor: string;
  textPreview: string[];
  textColor?: string;
  fontFamily?: string;
  hasLogo?: boolean;
};

export function isConfiguratorEnabled(metadata: unknown) {
  return (
    !!metadata &&
    typeof metadata === "object" &&
    (metadata as Record<string, unknown>).configurator_enabled === true
  );
}

export function getStringMetadata(
  metadata: unknown,
  key: string,
  fallback: string
) {
  if (!metadata || typeof metadata !== "object") {
    return fallback;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function getProductionExports(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return ["stl", "3mf"];
  }

  const value = (metadata as Record<string, unknown>).production_exports;
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : ["stl", "3mf"];
}

export function summarizeGraduationFavorPayload(
  payload: GraduationFavorPayload
): GraduationFavorSummary {
  const textItems = payload.surface.textItems.filter((item) =>
    item.text.trim()
  );
  const firstText = textItems[0];

  return {
    lineColor: payload.lineColor,
    textPreview: textItems.map((item) => item.text),
    textColor: firstText?.color,
    fontFamily: firstText?.fontFamily,
    hasLogo: payload.surface.logoItems.length > 0,
  };
}

export function getGraduationFavorSummaryFromMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const summary = (metadata as Record<string, unknown>).customizationSummary;
  if (!summary || typeof summary !== "object") {
    return null;
  }

  const raw = summary as Record<string, unknown>;
  const textPreview = Array.isArray(raw.textPreview)
    ? raw.textPreview.filter((item): item is string => typeof item === "string")
    : [];

  return {
    lineColor: typeof raw.lineColor === "string" ? raw.lineColor : undefined,
    textPreview,
    textColor: typeof raw.textColor === "string" ? raw.textColor : undefined,
    fontFamily: typeof raw.fontFamily === "string" ? raw.fontFamily : undefined,
    hasLogo: raw.hasLogo === true,
  };
}

export function hasGraduationFavorPreview(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return false;
  }

  const payload = (metadata as Record<string, unknown>).production_payload;
  return (
    !!payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    typeof (payload as Record<string, unknown>).previewImageId === "string"
  );
}
