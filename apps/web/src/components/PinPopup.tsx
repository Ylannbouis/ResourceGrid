"use client";

import { useState } from "react";
import { PinPriority, PinStatus, PinType, type Pin } from "@resourcegrid/shared";
import { claimPin, confirmPin, deletePin, resolvePin } from "@/lib/api";
import { hasConfirmed, rememberConfirmation } from "@/lib/confirmations";
import { forgetOwnership, getOwnerToken } from "@/lib/ownership";
import {
  categoryIcon,
  categoryLabel,
  isVerified,
  PRIORITY_LABEL,
  TYPE_LABEL,
  VERIFY_THRESHOLD,
} from "@/lib/pin-visuals";

export function PinPopup({ pin, onAction }: { pin: Pin; onAction: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedHere, setConfirmedHere] = useState(() => hasConfirmed(pin.id));
  const token = getOwnerToken(pin.id);
  const owned = Boolean(token);
  const verified = isVerified(pin);
  const showPriority =
    pin.type === PinType.NEED && pin.priority !== PinPriority.STANDARD;

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

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {showPriority && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white ${
              pin.priority === PinPriority.CRITICAL ? "bg-need" : "bg-claimed"
            }`}
          >
            {PRIORITY_LABEL[pin.priority]}
          </span>
        )}
        {verified ? (
          <span className="rounded-full bg-offer-soft px-2 py-0.5 text-[11px] font-bold text-offer">
            ✓ Verified by {pin.confirmations}
          </span>
        ) : (
          pin.confirmations > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
              {pin.confirmations} confirmation
              {pin.confirmations === 1 ? "" : "s"}
            </span>
          )
        )}
      </div>

      {pin.description && (
        <p className="mt-1.5 text-sm text-slate-600">{pin.description}</p>
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
            className="rounded-md bg-claimed px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Claim this
          </button>
        )}

        {/* Token-free corroboration — anyone nearby can vouch a report is real. */}
        {!owned && !confirmedHere && (
          <button
            disabled={busy}
            onClick={() =>
              run(async () => {
                await confirmPin(pin.id);
                rememberConfirmation(pin.id);
                setConfirmedHere(true);
              })
            }
            className="rounded-md border border-offer/40 bg-offer-soft px-3 py-1.5 text-sm font-semibold text-offer disabled:opacity-50"
          >
            ✓ I can confirm this
          </button>
        )}
        {confirmedHere && !verified && (
          <span className="self-center text-[11px] text-slate-400">
            Thanks — {VERIFY_THRESHOLD - pin.confirmations > 0
              ? `${VERIFY_THRESHOLD - pin.confirmations} more to verify`
              : "confirmed"}
          </span>
        )}

        {owned && (
          <>
            <button
              disabled={busy}
              onClick={() => run(() => resolvePin(pin.id, token!))}
              className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
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
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-50"
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
