"use client";

import { create } from "zustand";
import { PinStatus, type Pin } from "@resourcegrid/shared";
import { cachePins } from "./offline";

/** A pin plus a client-only flag for optimistic, not-yet-synced entries. */
export type ClientPin = Pin & { pending?: boolean };

interface PinState {
  pins: Record<string, ClientPin>;
  connected: boolean;
  setAll: (pins: Pin[]) => void;
  upsert: (pin: ClientPin) => void;
  remove: (id: string) => void;
  /** Swap an optimistic temp pin for the real one returned by the API after flush. */
  reconcile: (tempId: string, pin: Pin) => void;
  setConnected: (connected: boolean) => void;
}

/** Persist the synced (non-pending) pins so the map renders instantly / offline. */
function syncCache(pins: Record<string, ClientPin>): void {
  cachePins(Object.values(pins).filter((p) => !p.pending));
}

/**
 * Single source of truth for the live pin set. REST seeds it; socket deltas keep it
 * fresh. Resolved pins are removed so they leave the active map.
 */
export const usePinStore = create<PinState>((set) => ({
  pins: {},
  connected: false,
  setAll: (pins) =>
    set(() => {
      const next = Object.fromEntries(pins.map((p) => [p.id, p]));
      syncCache(next);
      return { pins: next };
    }),
  upsert: (pin) =>
    set((state) => {
      const next = { ...state.pins };
      if (pin.status === PinStatus.RESOLVED) {
        delete next[pin.id];
      } else {
        next[pin.id] = pin;
      }
      syncCache(next);
      return { pins: next };
    }),
  remove: (id) =>
    set((state) => {
      const next = { ...state.pins };
      delete next[id];
      syncCache(next);
      return { pins: next };
    }),
  reconcile: (tempId, pin) =>
    set((state) => {
      const next = { ...state.pins };
      delete next[tempId];
      if (pin.status !== PinStatus.RESOLVED) next[pin.id] = pin;
      syncCache(next);
      return { pins: next };
    }),
  setConnected: (connected) => set({ connected }),
}));

export const selectPinList = (state: PinState): ClientPin[] =>
  Object.values(state.pins);
