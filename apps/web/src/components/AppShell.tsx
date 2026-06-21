"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PinType,
  type CreatePinInput,
  type PinDetailsInput,
  type VoiceTriageResult,
} from "@resourcegrid/shared";
import {
  createPin,
  fetchPins,
  fetchVoiceStatus,
  flushQueue,
} from "@/lib/api";
import { queueCount, readCachedPins } from "@/lib/offline";
import { rememberOwnership } from "@/lib/ownership";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { usePinStore, type ClientPin } from "@/lib/store";
import { categoryLabel, TYPE_LABEL } from "@/lib/pin-visuals";
import { Header } from "./Header";
import { Legend } from "./Legend";
import { Map } from "./Map";
import { CreateSheet } from "./CreateSheet";
import { ResponderPanel } from "./ResponderPanel";
import { ShareQr } from "./ShareQr";
import { VoiceButton } from "./VoiceButton";
import type { LatLng } from "./MapView";

// Sensible fallback center until geolocation resolves (San Francisco).
const FALLBACK_CENTER: LatLng = { lat: 37.7749, lng: -122.4194 };

export function AppShell() {
  const pinsMap = usePinStore((s) => s.pins);
  const pins = useMemo(() => Object.values(pinsMap), [pinsMap]);
  const setAll = usePinStore((s) => s.setAll);
  const upsert = usePinStore((s) => s.upsert);

  const connected = usePinStore((s) => s.connected);

  const [center, setCenter] = useState<LatLng>(FALLBACK_CENTER);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [responderMode, setResponderMode] = useState(false);
  const [online, setOnline] = useState(true);
  const [queued, setQueued] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceToast, setVoiceToast] = useState<string | null>(null);

  // Pin creation is two steps:
  //   1. pendingType set, details null  → fill out the form
  //   2. details set (placing mode)     → tap the map to choose the location
  const [pendingType, setPendingType] = useState<PinType | null>(null);
  const [details, setDetails] = useState<PinDetailsInput | null>(null);
  const [draft, setDraft] = useState<LatLng | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placing = pendingType !== null && details !== null;

  // Seed from the offline cache first (instant + works with no network), then refresh
  // over REST and keep live over the socket.
  useEffect(() => {
    const cached = readCachedPins();
    if (cached.length) setAll(cached);
    fetchPins()
      .then(setAll)
      .catch(() => undefined);
    connectSocket();
    return () => disconnectSocket();
  }, [setAll]);

  // Track connectivity; flush the offline queue whenever we come back online.
  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => {
      setOnline(true);
      flushQueue().finally(() => setQueued(queueCount()));
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    // Poll the queue depth so the header badge stays current (same-tab writes don't
    // fire the storage event).
    const poll = setInterval(() => setQueued(queueCount()), 1500);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      clearInterval(poll);
    };
  }, []);

  // A fresh socket connection is also a good moment to drain anything queued.
  useEffect(() => {
    if (connected) flushQueue().finally(() => setQueued(queueCount()));
  }, [connected]);

  // Center on the device location (best-effort).
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(here);
        setUserLocation(here);
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  // Is AI voice triage configured on the backend? (gates the mic button)
  useEffect(() => {
    fetchVoiceStatus()
      .then((s) => setVoiceEnabled(s.enabled))
      .catch(() => setVoiceEnabled(false));
  }, []);

  // Responder Mode: fly the map to a queued request.
  const focusPin = (pin: ClientPin) => setCenter({ lat: pin.lat, lng: pin.lng });

  // Voice triage → auto-drop the parsed pin (no confirmation step).
  const onVoiceResult = async (result: VoiceTriageResult) => {
    try {
      const candidate: CreatePinInput = {
        ...result.details,
        description: result.details.description ?? undefined,
        contact: result.details.contact ?? undefined,
        lat: result.location.lat,
        lng: result.location.lng,
      };
      const pin = await createPin(candidate);
      rememberOwnership(pin.id, pin.ownerToken);
      upsert(pin); // instant feedback (socket broadcast also arrives)
      setCenter(result.location);
      setVoiceToast(`“${result.transcript}” → ${result.details.title}`);
      window.setTimeout(() => setVoiceToast(null), 6000);
    } catch (e) {
      setVoiceToast(
        e instanceof Error ? e.message : "Couldn't drop the voice pin.",
      );
      window.setTimeout(() => setVoiceToast(null), 6000);
    }
  };

  const startDraft = (type: PinType) => {
    setPendingType(type);
    setDetails(null);
    setDraft(null);
    setError(null);
  };

  const reset = () => {
    setPendingType(null);
    setDetails(null);
    setDraft(null);
    setError(null);
    setPosting(false);
  };

  // Form submitted → move to the map-placement step (no location yet).
  const proceedToPlacement = (d: PinDetailsInput) => {
    setDetails(d);
    setDraft(null);
    setError(null);
  };

  // Location chosen and confirmed → create the pin.
  const confirmPlacement = async () => {
    if (!details || !draft) return;
    setPosting(true);
    setError(null);
    try {
      const candidate: CreatePinInput = {
        ...details,
        lat: draft.lat,
        lng: draft.lng,
      };
      const pin = await createPin(candidate);
      rememberOwnership(pin.id, pin.ownerToken);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post pin");
      setPosting(false);
    }
  };

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      <Map
        pins={pins}
        center={center}
        userLocation={userLocation}
        draft={draft}
        placing={placing}
        onDraftMove={setDraft}
        onAction={() => undefined}
      />

      <Header
        onShare={() => setShowQr(true)}
        responderMode={responderMode}
        onToggleResponder={() => setResponderMode((v) => !v)}
        online={online}
        queued={queued}
      />
      <Legend />

      {responderMode && (
        <ResponderPanel
          pins={pins}
          onFocus={focusPin}
          onClose={() => setResponderMode(false)}
        />
      )}

      {/* Voice triage result toast. */}
      {voiceToast && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-[1400] flex justify-center px-4">
          <div className="pointer-events-auto max-w-md rounded-2xl bg-slate-900/90 px-4 py-2.5 text-center text-sm font-medium text-white shadow-card backdrop-blur">
            {voiceToast}
          </div>
        </div>
      )}

      {/* Primary actions — giant mic button (AI voice triage) over Need/Offer. */}
      {pendingType === null && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex flex-col items-center gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {voiceEnabled && (
            <VoiceButton location={userLocation} onResult={onVoiceResult} />
          )}
          <div className="flex w-full justify-center gap-3">
          <button
            onClick={() => startDraft(PinType.NEED)}
            className="group pointer-events-auto flex flex-1 max-w-[12rem] items-center justify-center gap-2 rounded-md bg-gradient-to-b from-rose-500 to-rose-600 py-3.5 text-base font-bold tracking-wide text-white shadow-lg shadow-rose-900/30 ring-1 ring-inset ring-white/25 transition duration-150 hover:from-rose-400 hover:to-rose-600 hover:shadow-rose-900/40 active:scale-95"
          >
            <span className="text-lg transition-transform group-hover:scale-110">
              🆘
            </span>
            Need help
          </button>
          <button
            onClick={() => startDraft(PinType.OFFER)}
            className="group pointer-events-auto flex flex-1 max-w-[12rem] items-center justify-center gap-2 rounded-md bg-gradient-to-b from-emerald-500 to-emerald-600 py-3.5 text-base font-bold tracking-wide text-white shadow-lg shadow-emerald-900/30 ring-1 ring-inset ring-white/25 transition duration-150 hover:from-emerald-400 hover:to-emerald-600 hover:shadow-emerald-900/40 active:scale-95"
          >
            <span className="text-lg transition-transform group-hover:scale-110">
              🤝
            </span>
            Offer
          </button>
          </div>
        </div>
      )}

      {/* Step 1: details form. */}
      {pendingType !== null && details === null && (
        <CreateSheet
          type={pendingType}
          onProceed={proceedToPlacement}
          onCancel={reset}
        />
      )}

      {/* Step 2: place the pin on the map. */}
      {placing && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1500] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto mx-auto max-w-md rounded-2xl bg-white/95 p-4 shadow-card backdrop-blur">
            <p className="text-sm font-semibold text-slate-800">
              {draft
                ? "Drag the pin or tap again to adjust, then post."
                : "Tap the map to place your pin."}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {TYPE_LABEL[pendingType]} · {categoryLabel(details.category)} —{" "}
              {details.title}
            </p>
            {error && <p className="mt-1 text-sm text-need">{error}</p>}
            <div className="mt-3 flex gap-2">
              <button
                onClick={reset}
                className="flex-1 rounded-md border border-slate-200 py-2.5 font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                disabled={!draft || posting}
                onClick={confirmPlacement}
                className={`flex-[2] rounded-md py-2.5 font-semibold text-white disabled:opacity-50 ${
                  pendingType === PinType.OFFER ? "bg-offer" : "bg-need"
                }`}
              >
                {posting ? "Posting…" : "Post pin here"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showQr && <ShareQr onClose={() => setShowQr(false)} />}
    </main>
  );
}
