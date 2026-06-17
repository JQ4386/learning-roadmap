"use client";

import { useEffect } from "react";

// Registers the offline-shell service worker once, on the client.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return; // avoid caching during dev
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch((e) => {
        console.warn("SW registration failed", e);
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
