import { z } from "zod";

/** Pin kind: a resource being offered, or help being requested. */
export const PinType = {
  OFFER: "OFFER",
  NEED: "NEED",
} as const;
export type PinType = (typeof PinType)[keyof typeof PinType];

/** Lifecycle status of a pin. */
export const PinStatus = {
  OPEN: "OPEN",
  CLAIMED: "CLAIMED",
  RESOLVED: "RESOLVED",
} as const;
export type PinStatus = (typeof PinStatus)[keyof typeof PinStatus];

/**
 * Suggested categories surfaced as quick-pick chips in the UI. `category` is stored
 * as a free string so the list can grow without a migration.
 */
export const CATEGORIES = [
  "water",
  "food",
  "shelter",
  "power",
  "generator",
  "charging",
  "medical",
  "transport",
  "tools",
  "road_blocked",
  "supplies",
  "other",
] as const;

const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);

/** Payload to create a pin. */
export const createPinSchema = z.object({
  type: z.nativeEnum(PinType),
  category: z.string().trim().min(1).max(40),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).optional(),
  contact: z.string().trim().max(200).optional(),
  lat,
  lng,
});
export type CreatePinInput = z.infer<typeof createPinSchema>;

/** Payload to edit a pin (owner only). All fields optional. */
export const updatePinSchema = z
  .object({
    category: z.string().trim().min(1).max(40),
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().max(1000).nullable(),
    contact: z.string().trim().max(200).nullable(),
    lat,
    lng,
  })
  .partial();
export type UpdatePinInput = z.infer<typeof updatePinSchema>;

/** Bounding box query for the map viewport. */
export const bboxSchema = z.object({
  minLat: lat,
  minLng: lng,
  maxLat: lat,
  maxLng: lng,
});
export type Bbox = z.infer<typeof bboxSchema>;

/** Public representation of a pin — never includes the secret owner token. */
export interface Pin {
  id: string;
  type: PinType;
  category: string;
  title: string;
  description: string | null;
  contact: string | null;
  lat: number;
  lng: number;
  status: PinStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

/** Returned only to the creator on POST — carries the secret token once. */
export interface OwnedPin extends Pin {
  ownerToken: string;
}

/** Header used to prove anonymous ownership on mutations. */
export const OWNER_TOKEN_HEADER = "x-owner-token";

/** Socket.IO event names broadcast by the API. */
export const SocketEvents = {
  PinCreated: "pin:created",
  PinUpdated: "pin:updated",
  PinResolved: "pin:resolved",
  PinDeleted: "pin:deleted",
} as const;

/** Typed map of server → client socket event payloads. */
export interface ServerToClientEvents {
  "pin:created": (pin: Pin) => void;
  "pin:updated": (pin: Pin) => void;
  "pin:resolved": (pin: Pin) => void;
  "pin:deleted": (payload: { id: string }) => void;
}
