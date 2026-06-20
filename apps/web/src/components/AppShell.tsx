"use client";

import { useEffect, useState } from "react";
import { PinType } from "@resourcegrid/shared";
import { fetchPins } from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { selectPinList, usePinStore } from "@/lib/store";
import { Header } from "./Header";
import { Legend } from "./Legend";
import { Map } from "./Map";
import { CreateSheet } from "./CreateSheet";
import { ShareQr } from "./ShareQr";
import type { LatLng } from "./MapView";

// Sensible fallback center until geolocation resolves (San Francisco).
const FALLBACK_CENTER: LatLng = { lat: 37.7749, lng: -122.4194 };

export function AppShell() {
  const pins = usePinStore(selectPinList);
  const setAll = usePinStore((s) => s.setAll);

  const [center, setCenter] = useState<LatLng>(FALLBACK_CENTER);
  const [drafting, setDrafting] = useState<PinType | null>(null);
  const [draft, setDraft] = useState<LatLng | null>(null);
  const [showQr, setShowQr] = useState(false);

  // Seed pins over REST, then keep them live over the socket.
  useEffect(() => {
    fetchPins()
      .then(setAll)
      .catch(() => undefined);
    connectSocket();
    return () => disconnectSocket();
  }, [setAll]);

  // Center on the device location (best-effort).
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const startDraft = (type: PinType) => {
    setDrafting(type);
    setDraft(center);
  };

  const closeDraft = () => {
    setDrafting(null);
    setDraft(null);
  };

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      <Map
        pins={pins}
        center={center}
        draft={draft}
        onDraftMove={setDraft}
        onAction={() => undefined}
      />

      <Header onShare={() => setShowQr(true)} />
      <Legend />

      {/* Primary actions — big, one-handed tap targets. */}
      {!drafting && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex justify-center gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => startDraft(PinType.NEED)}
            className="pointer-events-auto flex-1 max-w-[12rem] rounded-2xl bg-need py-3.5 text-base font-bold text-white shadow-card active:scale-95"
          >
            🆘 Need help
          </button>
          <button
            onClick={() => startDraft(PinType.OFFER)}
            className="pointer-events-auto flex-1 max-w-[12rem] rounded-2xl bg-offer py-3.5 text-base font-bold text-white shadow-card active:scale-95"
          >
            🤝 Offer
          </button>
        </div>
      )}

      {drafting && draft && (
        <CreateSheet
          type={drafting}
          pos={draft}
          onCreated={closeDraft}
          onCancel={closeDraft}
        />
      )}

      {showQr && <ShareQr onClose={() => setShowQr(false)} />}
    </main>
  );
}
