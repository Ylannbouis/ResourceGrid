"use client";

import { usePinStore } from "@/lib/store";

interface HeaderProps {
  onShare: () => void;
  responderMode: boolean;
  onToggleResponder: () => void;
  online: boolean;
  queued: number;
}

export function Header({
  onShare,
  responderMode,
  onToggleResponder,
  online,
  queued,
}: HeaderProps) {
  const connected = usePinStore((s) => s.connected);

  // Status line: offline (with any queued changes) takes precedence over live/connecting.
  const status = !online
    ? {
        dot: "bg-claimed",
        text: queued > 0 ? `Offline · ${queued} queued` : "Offline",
      }
    : connected
      ? { dot: "bg-offer", text: queued > 0 ? `Syncing ${queued}…` : "Live" }
      : { dot: "bg-slate-300", text: "Connecting…" };

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex items-center justify-between gap-2 p-3">
      <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-white/95 px-3.5 py-2 shadow-card backdrop-blur">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-white">
          ▦
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold text-slate-800">ResourceGrid</p>
          <p className="flex items-center gap-1 text-[11px] text-slate-500">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${status.dot}`}
            />
            {status.text}
          </p>
        </div>
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        <button
          onClick={onToggleResponder}
          aria-pressed={responderMode}
          className={`rounded-md px-3.5 py-2 text-sm font-semibold shadow-card backdrop-blur transition ${
            responderMode
              ? "bg-brand text-white"
              : "bg-white/95 text-brand"
          }`}
        >
          {responderMode ? "Exit triage" : "Responder"}
        </button>
        <button
          onClick={onShare}
          className="rounded-md bg-white/95 px-3.5 py-2 text-sm font-semibold text-brand shadow-card backdrop-blur"
        >
          Share / QR
        </button>
      </div>
    </header>
  );
}
