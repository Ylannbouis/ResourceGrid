"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

/**
 * The zero-friction pitch: post this QR on a community board, scan, and the app opens
 * straight into the map — no install, no account.
 */
export function ShareQr({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(window.location.href), []);

  return (
    <div
      className="fixed inset-0 z-[2000] grid place-items-center bg-slate-900/50 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-slate-800">Share ResourceGrid</h2>
        <p className="mt-1 text-sm text-slate-500">
          Scan to open this map. No app, no account.
        </p>
        <div className="mt-4 grid place-items-center rounded-xl bg-slate-50 p-4">
          {url && <QRCodeSVG value={url} size={180} fgColor="#0f766e" />}
        </div>
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-md bg-brand py-2.5 font-semibold text-white"
        >
          Done
        </button>
      </div>
    </div>
  );
}
