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
 * Triage urgency for a request — a SALT/START-style severity signal so responders can
 * prioritize. Offers default to STANDARD; only NEED pins surface a selector in the UI.
 */
export const PinPriority = {
  CRITICAL: "CRITICAL",
  URGENT: "URGENT",
  STANDARD: "STANDARD",
} as const;
export type PinPriority = (typeof PinPriority)[keyof typeof PinPriority];

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
  priority: z.nativeEnum(PinPriority).optional().default(PinPriority.STANDARD),
  lat,
  lng,
});
export type CreatePinInput = z.infer<typeof createPinSchema>;

/** Pin details captured in the form, before the location is placed on the map. */
export const pinDetailsSchema = createPinSchema.omit({ lat: true, lng: true });
export type PinDetailsInput = z.infer<typeof pinDetailsSchema>;

/** Payload to edit a pin (owner only). All fields optional. */
export const updatePinSchema = z
  .object({
    category: z.string().trim().min(1).max(40),
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().max(1000).nullable(),
    contact: z.string().trim().max(200).nullable(),
    priority: z.nativeEnum(PinPriority),
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
  priority: PinPriority;
  /** Count of independent anonymous corroborations. >= 2 is treated as "verified". */
  confirmations: number;
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

/**
 * Result of AI voice triage: a spoken request transcribed (Deepgram) and parsed (Claude)
 * into a structured pin, with the spoken location geocoded. `details` matches the shape
 * produced by `pinDetailsSchema` so it drops straight into a create.
 */
export const voiceTriageResultSchema = z.object({
  transcript: z.string(),
  details: z.object({
    type: z.nativeEnum(PinType),
    category: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    contact: z.string().nullable(),
    priority: z.nativeEnum(PinPriority),
  }),
  location: z.object({ lat, lng }),
  /** false ⇒ no usable spoken location; fell back to the device location / map center. */
  geocoded: z.boolean(),
  /** What the user said about where they are (may be empty). */
  locationText: z.string(),
});
export type VoiceTriageResult = z.infer<typeof voiceTriageResultSchema>;

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
