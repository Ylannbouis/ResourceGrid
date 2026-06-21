import {
  PinPriority,
  PinStatus,
  PinType,
  type Pin,
} from "@resourcegrid/shared";

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

/** Human label + ordering weight per triage priority. */
export const PRIORITY_LABEL: Record<PinPriority, string> = {
  [PinPriority.CRITICAL]: "Critical",
  [PinPriority.URGENT]: "Urgent",
  [PinPriority.STANDARD]: "Standard",
};

/** Sort weight (lower = more urgent) for client-side triage queues. */
export const PRIORITY_WEIGHT: Record<PinPriority, number> = {
  [PinPriority.CRITICAL]: 0,
  [PinPriority.URGENT]: 1,
  [PinPriority.STANDARD]: 2,
};

/**
 * Marker priority modifier (see globals.css `.rg-marker--prio-*`). Only meaningful for
 * open NEED pins — offers and claimed/standard pins render with no urgency emphasis.
 */
export function priorityClass(pin: Pin): "crit" | "urgent" | "standard" {
  if (
    pin.type !== PinType.NEED ||
    pin.status !== PinStatus.OPEN ||
    pin.priority === PinPriority.STANDARD
  ) {
    return "standard";
  }
  return pin.priority === PinPriority.CRITICAL ? "crit" : "urgent";
}

/** A pin is "verified" once at least two independent people corroborate it. */
export const VERIFY_THRESHOLD = 2;

export function isVerified(pin: Pin): boolean {
  return pin.confirmations >= VERIFY_THRESHOLD;
}
