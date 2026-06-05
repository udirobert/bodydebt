"use client";

import { useEffect, useState, useRef } from "react";

interface ServiceWorkerState {
  registered: boolean;
  cached: boolean;
  error: string | null;
}

const INITIAL_STATE: ServiceWorkerState = {
  registered: false,
  cached: false,
  error: null,
};

/**
 * Registers the ZK artifact service worker on mount.
 * Tracks registration and cache status for UI feedback.
 */
export function useServiceWorker(): ServiceWorkerState {
  const [state, setState] = useState<ServiceWorkerState>(INITIAL_STATE);
  const registeredRef = useRef(false);

  useEffect(() => {
    if (registeredRef.current) return;

    if (!("serviceWorker" in navigator)) {
      return; // no SW support — state stays at defaults
    }

    registeredRef.current = true;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Use setTimeout to break the setState-out-of-effect warning
        setTimeout(() => setState((prev) => ({ ...prev, registered: true })), 0);

        if (registration.active) {
          setTimeout(() => setState((prev) => ({ ...prev, cached: true })), 0);
        }

        registration.onupdatefound = () => {
          const installing = registration.installing;
          if (installing) {
            installing.onstatechange = () => {
              if (installing.state === "activated") {
                setTimeout(() => setState((prev) => ({ ...prev, cached: true })), 0);
              }
            };
          }
        };
      })
      .catch(() => {
        // Silent failure — SW isn't critical, just nice-to-have
      });
  }, []);

  return state;
}
