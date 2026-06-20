"use client";

import { useState } from "react";
import { PinStatus, PinType, type Pin } from "@resourcegrid/shared";
import { claimPin, deletePin, resolvePin } from "@/lib/api";
import { forgetOwnership, getOwnerToken } from "@/lib/ownership";
import { categoryIcon, categoryLabel, TYPE_LABEL } from "@/lib/pin-visuals";

export function PinPopup({ pin, onAction }: { pin: Pin; onAction: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = getOwnerToken(pin.id);
  const owned = Boolean(token);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onAction();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const typeColor =
    pin.status === PinStatus.CLAIMED
      ? "text-claimed"
      : pin.type === PinType.OFFER
        ? "text-offer"
        : "text-need";

  return (
    <div className="p-3.5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
        <span className={typeColor}>
          {pin.status === PinStatus.CLAIMED ? "Claimed" : TYPE_LABEL[pin.type]}
        </span>
        <span className="text-slate-300">•</span>
        <span className="text-slate-500">
          {categoryIcon(pin.category)} {categoryLabel(pin.category)}
        </span>
      </div>

      <h3 className="mt-1 text-base font-semibold text-slate-800">{pin.title}</h3>
      {pin.description && (
        <p className="mt-1 text-sm text-slate-600">{pin.description}</p>
      )}
      {pin.contact && (
        <p className="mt-2 text-sm">
          <span className="text-slate-400">Contact: </span>
          <span className="font-medium text-slate-700">{pin.contact}</span>
        </p>
      )}

      {error && <p className="mt-2 text-xs text-need">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {pin.type === PinType.OFFER && pin.status === PinStatus.OPEN && !owned && (
          <button
            disabled={busy}
            onClick={() => run(() => claimPin(pin.id))}
            className="rounded-lg bg-claimed px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Claim this
          </button>
        )}

        {owned && (
          <>
            <button
              disabled={busy}
              onClick={() => run(() => resolvePin(pin.id, token!))}
              className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Mark resolved
            </button>
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await deletePin(pin.id, token!);
                  forgetOwnership(pin.id);
                })
              }
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-50"
            >
              Delete
            </button>
          </>
        )}
      </div>

      {owned && (
        <p className="mt-2 text-[11px] text-slate-400">You created this pin.</p>
      )}
    </div>
  );
}
