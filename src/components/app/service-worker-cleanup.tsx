"use client";

import { useEffect } from "react";

export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    void (async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      } catch (error) {
        console.error("[sw-cleanup] Falha ao remover service workers legados.", error);
      }

      if (!("caches" in window)) {
        return;
      }

      try {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
      } catch (error) {
        console.error("[sw-cleanup] Falha ao limpar caches legados.", error);
      }
    })();
  }, []);

  return null;
}
