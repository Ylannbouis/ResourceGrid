"use client";

import { create } from "zustand";
import { PinStatus, type Pin } from "@resourcegrid/shared";

interface PinState {
  pins: Record<string, Pin>;
  connected: boolean;
  setAll: (pins: Pin[]) => void;
  upsert: (pin: Pin) => void;
  remove: (id: string) => void;
  setConnected: (connected: boolean) => void;
}

/**
 * Single source of truth for the live pin set. REST seeds it; socket deltas keep it
 * fresh. Resolved pins are removed so they leave the active map.
 */
export const usePinStore = create<PinState>((set) => ({
  pins: {},
  connected: false,
  setAll: (pins) =>
    set({ pins: Object.fromEntries(pins.map((p) => [p.id, p])) }),
  upsert: (pin) =>
    set((state) => {
      if (pin.status === PinStatus.RESOLVED) {
        const next = { ...state.pins };
        delete next[pin.id];
        return { pins: next };
      }
      return { pins: { ...state.pins, [pin.id]: pin } };
    }),
  remove: (id) =>
    set((state) => {
      const next = { ...state.pins };
      delete next[id];
      return { pins: next };
    }),
  setConnected: (connected) => set({ connected }),
}));

export const selectPinList = (state: PinState): Pin[] =>
  Object.values(state.pins);
