"use client";

import { useServiceWorker } from "@/lib/hooks/useServiceWorker";

/**
 * Registers the ZK artifact service worker silently on mount.
 * No UI — purely functional. The service worker status is surfaced
 * in scan-result.tsx for transparency.
 */
export function ServiceWorkerRegister() {
  useServiceWorker();
  return null;
}
