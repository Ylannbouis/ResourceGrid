"use client";

/**
 * Anonymous corroboration dedupe. Confirming a pin is token-free (anyone nearby can
 * vouch that a report is real), so we keep a per-device set of pin ids this browser has
 * already confirmed in localStorage — same lightweight pattern as ownership.ts. This is
 * client-side only; true server-side dedupe would need an anon device id.
 */
const KEY = "resourcegrid.confirmed-pins";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? (raw as string[]) : [];
  } catch {
    return [];
  }
}

export function rememberConfirmation(pinId: string): void {
  const ids = read();
  if (ids.includes(pinId)) return;
  ids.push(pinId);
  window.localStorage.setItem(KEY, JSON.stringify(ids));
}

export function hasConfirmed(pinId: string): boolean {
  return read().includes(pinId);
}
