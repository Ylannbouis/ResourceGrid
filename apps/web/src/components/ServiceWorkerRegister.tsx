"use client";

import { useEffect } from "react";

/** Registers the service worker that makes ResourceGrid an installable PWA. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* registration is best-effort; app works without it */
    });
  }, []);

  return null;
}
