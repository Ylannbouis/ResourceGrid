import type { Pin as DbPin } from "@prisma/client";
import type { OwnedPin, Pin } from "@resourcegrid/shared";

/** Strip the secret token and serialize dates → the safe public shape. */
export function toPublicPin(pin: DbPin): Pin {
  return {
    id: pin.id,
    type: pin.type,
    category: pin.category,
    title: pin.title,
    description: pin.description,
    contact: pin.contact,
    priority: pin.priority,
    confirmations: pin.confirmations,
    lat: pin.lat,
    lng: pin.lng,
    status: pin.status,
    expiresAt: pin.expiresAt.toISOString(),
    createdAt: pin.createdAt.toISOString(),
    updatedAt: pin.updatedAt.toISOString(),
  };
}

/** Public shape plus the owner token — returned only to the creator on POST. */
export function toOwnedPin(pin: DbPin): OwnedPin {
  return { ...toPublicPin(pin), ownerToken: pin.ownerToken };
}
