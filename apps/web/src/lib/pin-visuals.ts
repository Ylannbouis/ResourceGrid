import { PinStatus, PinType, type Pin } from "@resourcegrid/shared";

/** Emoji glyph per category — quick visual scanning on the map and in chips. */
export const CATEGORY_ICON: Record<string, string> = {
  water: "💧",
  food: "🍲",
  shelter: "🏠",
  power: "🔌",
  generator: "⚡",
  charging: "🔋",
  medical: "🚑",
  transport: "🚗",
  tools: "🛠️",
  road_blocked: "🚧",
  supplies: "📦",
  other: "📍",
};

export function categoryIcon(category: string): string {
  return CATEGORY_ICON[category] ?? "📍";
}

export function categoryLabel(category: string): string {
  return category
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Marker modifier class (see globals.css) reflecting type + status. */
export function markerVariant(pin: Pin): "offer" | "need" | "claimed" {
  if (pin.status === PinStatus.CLAIMED) return "claimed";
  return pin.type === PinType.OFFER ? "offer" : "need";
}

export const TYPE_LABEL: Record<PinType, string> = {
  [PinType.OFFER]: "Offering",
  [PinType.NEED]: "Need help",
};
