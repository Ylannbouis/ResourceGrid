"use client";

import dynamic from "next/dynamic";

/**
 * Leaflet needs `window`, so the map is loaded client-side only. This wrapper is the
 * single import the rest of the app uses.
 */
export const Map = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-slate-200 text-slate-500">
      Loading map…
    </div>
  ),
});
