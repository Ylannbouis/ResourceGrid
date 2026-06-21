"use client";

import type { CreatePinInput, Pin } from "@resourcegrid/shared";

/**
 * Offline-first storage. Cellular networks congest or fail in the first hours of a
 * disaster — exactly when reports matter most. We keep two things in localStorage so the
 * app keeps working through a blackout:
 *
 *  1. A snapshot of the last-known pins, so the map renders instantly (and offline).
 *  2. A FIFO queue of mutations made while offline, flushed on reconnect (see api.ts).
 *
 * localStorage is used over IndexedDB for zero-dependency reliability; the pin set is
 * small. IndexedDB would be the upgrade path if payloads ever grow.
 */
const CACHE_KEY = "resourcegrid.pin-cache";
const QUEUE_KEY = "resourcegrid.pending-queue";

const hasWindow = (): boolean => typeof window !== "undefined";

// ---- Snapshot cache ---------------------------------------------------------

export function cachePins(pins: Pin[]): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(pins));
  } catch {
    /* quota / private mode — non-fatal */
  }
}

export function readCachedPins(): Pin[] {
  if (!hasWindow()) return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? "[]");
    return Array.isArray(raw) ? (raw as Pin[]) : [];
  } catch {
    return [];
  }
}

// ---- Pending mutation queue -------------------------------------------------

export type PendingMutation =
  | { id: string; kind: "create"; tempId: string; payload: CreatePinInput }
  | { id: string; kind: "claim"; payload: { id: string } }
  | { id: string; kind: "confirm"; payload: { id: string } };

export function readQueue(): PendingMutation[] {
  if (!hasWindow()) return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(QUEUE_KEY) ?? "[]");
    return Array.isArray(raw) ? (raw as PendingMutation[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingMutation[]): void {
  if (!hasWindow()) return;
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Distributive Omit so each union member keeps its own fields (e.g. `tempId`). */
type NewMutation = PendingMutation extends infer M
  ? M extends PendingMutation
    ? Omit<M, "id">
    : never
  : never;

export function enqueue(mutation: NewMutation): void {
  const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  writeQueue([...readQueue(), { ...mutation, id } as PendingMutation]);
}

export function queueCount(): number {
  return readQueue().length;
}

export function clearQueue(): void {
  writeQueue([]);
}
