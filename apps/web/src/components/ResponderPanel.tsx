"use client";

import { useMemo, useState } from "react";
import { PinStatus, PinType } from "@resourcegrid/shared";
import {
  categoryIcon,
  categoryLabel,
  isVerified,
  PRIORITY_LABEL,
  PRIORITY_WEIGHT,
  priorityClass,
} from "@/lib/pin-visuals";
import type { ClientPin } from "@/lib/store";

interface ResponderPanelProps {
  pins: ClientPin[];
  onFocus: (pin: ClientPin) => void;
  onClose: () => void;
}

/** Compact relative age, e.g. "3m", "2h", "1d". */
function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

const PRIORITY_DOT: Record<ReturnType<typeof priorityClass>, string> = {
  crit: "bg-need",
  urgent: "bg-claimed",
  standard: "bg-slate-300",
};

/**
 * Responder Mode: a live triage queue of open requests, sorted most-urgent-first then
 * oldest-first — the "common operating picture" responders work from. Tapping a row
 * flies the map to that pin.
 */
export function ResponderPanel({ pins, onFocus, onClose }: ResponderPanelProps) {
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const queue = useMemo(() => {
    return pins
      .filter(
        (p) =>
          p.type === PinType.NEED &&
          p.status === PinStatus.OPEN &&
          (!verifiedOnly || isVerified(p)),
      )
      .sort((a, b) => {
        const byPriority = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
        if (byPriority !== 0) return byPriority;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [pins, verifiedOnly]);

  return (
    <aside className="pointer-events-auto absolute right-0 top-0 z-[1600] flex h-[100dvh] w-[20rem] max-w-[85vw] flex-col bg-white/97 shadow-sheet backdrop-blur">
      <div className="flex items-center justify-between border-b border-slate-100 p-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Responder Mode</h2>
          <p className="text-[11px] text-slate-500">
            {queue.length} open request{queue.length === 1 ? "" : "s"} · triage order
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-md px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100"
        >
          ✕
        </button>
      </div>

      <label className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-xs font-medium text-slate-600">
        <input
          type="checkbox"
          checked={verifiedOnly}
          onChange={(e) => setVerifiedOnly(e.target.checked)}
          className="h-3.5 w-3.5 accent-offer"
        />
        Verified only
      </label>

      <div className="flex-1 overflow-y-auto">
        {queue.length === 0 ? (
          <p className="p-4 text-sm text-slate-400">No matching open requests.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {queue.map((pin) => (
              <li key={pin.id}>
                <button
                  onClick={() => onFocus(pin)}
                  className="flex w-full items-start gap-3 p-3 text-left hover:bg-slate-50"
                >
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                      PRIORITY_DOT[priorityClass(pin)]
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-slate-800">
                        {categoryIcon(pin.category)} {pin.title}
                      </span>
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                      <span className="font-medium uppercase tracking-wide">
                        {PRIORITY_LABEL[pin.priority]}
                      </span>
                      <span>· {categoryLabel(pin.category)}</span>
                      <span>· {ago(pin.createdAt)}</span>
                      {isVerified(pin) && (
                        <span className="font-semibold text-offer">
                          · ✓ {pin.confirmations}
                        </span>
                      )}
                      {pin.pending && (
                        <span className="font-semibold text-claimed">· syncing…</span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
