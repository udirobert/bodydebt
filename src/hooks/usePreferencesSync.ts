"use client";

import { useEffect, useRef } from "react";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { useEazo } from "@/lib/sdk/eazo-react";

/**
 * usePreferencesSync
 *
 * When the user is authenticated, syncs their Zustand preferences
 * (mode, orbPersonality, locale, wakeTime, bedTime) to the DB so
 * they're available on other devices. On first sign-in, also loads
 * any saved preferences from the DB into the local store.
 *
 * Also triggers the anonymous → user memory migration on first auth.
 */
export function usePreferencesSync() {
  const user = useEazo((s) => s.auth.user);
  const authenticated = useEazo((s) => s.auth.authenticated);
  const hasSyncedRef = useRef(false);

  const mode = useBodyDebtStore((s) => s.mode);
  const orbPersonality = useBodyDebtStore((s) => s.orbPersonality);
  const locale = useBodyDebtStore((s) => s.locale);
  const setMode = useBodyDebtStore((s) => s.setMode);
  const setOrbPersonality = useBodyDebtStore((s) => s.setOrbPersonality);
  const setLocale = useBodyDebtStore((s) => s.setLocale);
  const anonymousId = useBodyDebtStore((s) => s.anonymousId);

  // On first authentication: load DB preferences + migrate memory
  useEffect(() => {
    if (!authenticated || !user || hasSyncedRef.current) return;
    hasSyncedRef.current = true;

    // 1. Load saved preferences from DB
    fetch("/api/user/preferences")
      .then((r) => r.json())
      .then((data) => {
        if (data?.preferences) {
          const p = data.preferences;
          if (p.mode) setMode(p.mode);
          if (p.orbPersonality) setOrbPersonality(p.orbPersonality);
          if (p.locale) setLocale(p.locale);
        }
      })
      .catch(() => {});

    // 2. Migrate guest Supermemory to userId
    if (anonymousId) {
      fetch("/api/user/migrate-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonymousId }),
      }).catch(() => {});
    }
  }, [authenticated, user, anonymousId, setMode, setOrbPersonality, setLocale]);

  // Debounced save: when preferences change and user is authed, push to DB
  useEffect(() => {
    if (!authenticated) return;
    const timer = setTimeout(() => {
      fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, orbPersonality, locale }),
      }).catch(() => {});
    }, 2000); // 2s debounce
    return () => clearTimeout(timer);
  }, [authenticated, mode, orbPersonality, locale]);
}
