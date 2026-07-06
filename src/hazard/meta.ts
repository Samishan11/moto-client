import type { HazardType } from "@moto/contract";

/** Display metadata for each hazard type, shared by the picker, banner and map. */
export interface HazardMeta {
  type: HazardType;
  label: string;
  emoji: string;
}

export const HAZARD_TYPES: HazardMeta[] = [
  { type: "ACCIDENT", label: "Accident", emoji: "🚨" },
  { type: "CONSTRUCTION", label: "Construction", emoji: "🚧" },
  { type: "POLICE", label: "Police", emoji: "👮" },
  { type: "ANIMAL", label: "Animal", emoji: "🐄" },
  { type: "WEATHER", label: "Weather", emoji: "🌧️" },
  { type: "OBSTACLE", label: "Obstacle", emoji: "⚠️" },
  { type: "FUEL", label: "Fuel", emoji: "⛽" },
  { type: "OTHER", label: "Other", emoji: "📍" },
];

const BY_TYPE: Record<HazardType, HazardMeta> = Object.fromEntries(
  HAZARD_TYPES.map((m) => [m.type, m]),
) as Record<HazardType, HazardMeta>;

export function hazardMeta(type: HazardType): HazardMeta {
  return BY_TYPE[type] ?? BY_TYPE.OTHER;
}

/** Warning yellow — the hazard visual language across the app. */
export const HAZARD_COLOR = "#FFD60A";
