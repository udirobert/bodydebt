"use client";

import { useEffect, useRef } from "react";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { useEazo } from "@/lib/sdk/eazo-react";

/**
 * useSquadSync
 *
 * When the user is authenticated, syncs their squad roster to the DB
 * for cross-device persistence. On first sign-in, loads any saved
 * squad from the DB into the local Zustand store (only if the local
 * squad is empty — doesn't overwrite local edits).
 *
 * The squad is saved with a 3-second debounce to avoid hammering
 * the API on every keystroke during player editing.
 */
export function useSquadSync() {
  const authenticated = useEazo((s) => s.auth.authenticated);
  const squad = useBodyDebtStore((s) => s.squad);
  const hasLoadedRef = useRef(false);

  // On first authentication: load squad from DB
  useEffect(() => {
    if (!authenticated || hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    fetch("/api/squad")
      .then((r) => r.json())
      .then((data) => {
        if (data?.squad && data.squad.length > 0) {
          // Only load if the local squad is empty (don't overwrite local edits)
          const currentSquad = useBodyDebtStore.getState().squad;
          if (currentSquad.length === 0) {
            useBodyDebtStore.getState().setSquad(data.squad);
          }
        }
      })
      .catch(() => {});
  }, [authenticated]);

  // Debounced save: when squad changes and user is authed, push to DB
  useEffect(() => {
    if (!authenticated) return;
    const timer = setTimeout(() => {
      fetch("/api/squad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ squad }),
      }).catch(() => {});
    }, 3000); // 3s debounce — squad edits are multi-step
    return () => clearTimeout(timer);
  }, [authenticated, squad]);
}
