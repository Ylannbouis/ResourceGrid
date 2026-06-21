import {
  OWNER_TOKEN_HEADER,
  PinPriority,
  PinStatus,
  type CreatePinInput,
  type OwnedPin,
  type Pin,
  type UpdatePinInput,
  type VoiceTriageResult,
} from "@resourcegrid/shared";
import { clearQueue, enqueue, readQueue } from "./offline";
import { forgetOwnership, rememberOwnership } from "./ownership";
import { usePinStore } from "./store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const base = `${API_URL}/api`;

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new Error(body?.message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

const isOffline = (): boolean =>
  typeof navigator !== "undefined" && navigator.onLine === false;

export async function fetchPins(): Promise<Pin[]> {
  return handle<Pin[]>(await fetch(`${base}/pins`, { cache: "no-store" }));
}

// ---- AI Voice Triage --------------------------------------------------------

/** Whether the backend has both provider keys configured (gates the mic button). */
export async function fetchVoiceStatus(): Promise<{ enabled: boolean }> {
  try {
    return await handle<{ enabled: boolean }>(
      await fetch(`${base}/voice/status`, { cache: "no-store" }),
    );
  } catch {
    return { enabled: false };
  }
}

/** Upload recorded audio; backend transcribes, extracts, and geocodes it. */
export async function triageVoice(
  blob: Blob,
  loc?: { lat: number; lng: number },
): Promise<VoiceTriageResult> {
  const form = new FormData();
  form.append("audio", blob, "voice.webm");
  if (loc) {
    form.append("lat", String(loc.lat));
    form.append("lng", String(loc.lng));
  }
  // No Content-Type header — the browser sets the multipart boundary.
  return handle<VoiceTriageResult>(
    await fetch(`${base}/voice/triage`, { method: "POST", body: form }),
  );
}

// ---- Network primitives (always hit the server) -----------------------------

function netCreate(input: CreatePinInput): Promise<OwnedPin> {
  return fetch(`${base}/pins`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((r) => handle<OwnedPin>(r));
}

function netClaim(id: string): Promise<Pin> {
  return fetch(`${base}/pins/${id}/claim`, { method: "POST" }).then((r) =>
    handle<Pin>(r),
  );
}

function netConfirm(id: string): Promise<Pin> {
  return fetch(`${base}/pins/${id}/confirm`, { method: "POST" }).then((r) =>
    handle<Pin>(r),
  );
}

// ---- Public mutations (offline-aware) ---------------------------------------

export async function createPin(input: CreatePinInput): Promise<OwnedPin> {
  if (isOffline()) {
    const tempId = `temp_${Math.random().toString(36).slice(2, 12)}`;
    const now = new Date().toISOString();
    const optimistic: OwnedPin = {
      id: tempId,
      type: input.type,
      category: input.category,
      title: input.title,
      description: input.description ?? null,
      contact: input.contact ?? null,
      priority: input.priority ?? PinPriority.STANDARD,
      confirmations: 0,
      lat: input.lat,
      lng: input.lng,
      status: PinStatus.OPEN,
      // Placeholder TTL; the real value arrives when the queue flushes.
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
      updatedAt: now,
      ownerToken: `temp_${tempId}`,
    };
    usePinStore.getState().upsert({ ...optimistic, pending: true });
    enqueue({ kind: "create", tempId, payload: input });
    return optimistic;
  }
  return netCreate(input);
}

export async function claimPin(id: string): Promise<Pin> {
  if (isOffline()) {
    const existing = usePinStore.getState().pins[id];
    if (existing) {
      usePinStore.getState().upsert({ ...existing, status: PinStatus.CLAIMED });
    }
    enqueue({ kind: "claim", payload: { id } });
    return { ...(existing as Pin), status: PinStatus.CLAIMED };
  }
  return netClaim(id);
}

export async function confirmPin(id: string): Promise<Pin> {
  if (isOffline()) {
    const existing = usePinStore.getState().pins[id];
    if (existing) {
      usePinStore
        .getState()
        .upsert({ ...existing, confirmations: existing.confirmations + 1 });
    }
    enqueue({ kind: "confirm", payload: { id } });
    return {
      ...(existing as Pin),
      confirmations: (existing?.confirmations ?? 0) + 1,
    };
  }
  return netConfirm(id);
}

export async function updatePin(
  id: string,
  token: string,
  input: UpdatePinInput,
): Promise<Pin> {
  return handle<Pin>(
    await fetch(`${base}/pins/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", [OWNER_TOKEN_HEADER]: token },
      body: JSON.stringify(input),
    }),
  );
}

export async function resolvePin(id: string, token: string): Promise<Pin> {
  return handle<Pin>(
    await fetch(`${base}/pins/${id}/resolve`, {
      method: "POST",
      headers: { [OWNER_TOKEN_HEADER]: token },
    }),
  );
}

export async function deletePin(
  id: string,
  token: string,
): Promise<{ id: string }> {
  return handle<{ id: string }>(
    await fetch(`${base}/pins/${id}`, {
      method: "DELETE",
      headers: { [OWNER_TOKEN_HEADER]: token },
    }),
  );
}

// ---- Queue flush (called on reconnect) --------------------------------------

let flushing = false;

/**
 * Replay queued offline mutations against the server in order. Creates run first and
 * map their temp id → real id so any later claim/confirm on the same pin still lands.
 * Failures are re-queued; successes broadcast back via the socket as usual.
 */
export async function flushQueue(): Promise<void> {
  if (flushing || isOffline()) return;
  const queue = readQueue();
  if (queue.length === 0) return;

  flushing = true;
  clearQueue();
  const idMap: Record<string, string> = {};

  try {
    for (const m of queue) {
      try {
        if (m.kind === "create") {
          const real = await netCreate(m.payload);
          rememberOwnership(real.id, real.ownerToken);
          forgetOwnership(m.tempId);
          usePinStore.getState().reconcile(m.tempId, real);
          idMap[m.tempId] = real.id;
        } else {
          const targetId = idMap[m.payload.id] ?? m.payload.id;
          if (targetId.startsWith("temp_")) continue; // unresolved — drop
          if (m.kind === "claim") await netClaim(targetId);
          else await netConfirm(targetId);
        }
      } catch {
        // Keep failed mutations for the next flush attempt.
        enqueue(
          m.kind === "create"
            ? { kind: "create", tempId: m.tempId, payload: m.payload }
            : { kind: m.kind, payload: m.payload },
        );
      }
    }
  } finally {
    flushing = false;
  }
}
