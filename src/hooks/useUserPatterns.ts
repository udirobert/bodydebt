"use client";

import { useEffect, useState } from "react";
import { useEazo } from "@/lib/sdk/eazo-react";

export interface UserPatterns {
  totalSessions: number;
  avgScore: number;
  trendDirection: "improving" | "worsening" | "stable";
  trendDelta: number;
  bestSystem: string | null;
  worstSystem: string | null;
  dayOfWeekPattern: string | null;
  lastSessionDate: string | null;
  streakDays: number;
}

/**
 * useUserPatterns
 *
 * Fetches analyzed patterns from the user's debt session history.
 * Only fetches when authenticated. Returns null for guests.
 *
 * Used by the MemoryCard for personalized greetings and by the
 * dashboard for streak awareness.
 */
export function useUserPatterns(): {
  patterns: UserPatterns | null;
  loading: boolean;
} {
  const authenticated = useEazo((s) => s.auth.authenticated);
  const [patterns, setPatterns] = useState<UserPatterns | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authenticated) return;

    let cancelled = false;
    // Defer loading flag so we don't sync-setState in the effect body.
    const kickoff = queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    void kickoff;

    fetch("/api/user/patterns")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setPatterns(data.patterns ?? null);
      })
      .catch(() => {
        if (!cancelled) setPatterns(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authenticated]);

  if (!authenticated) {
    return { patterns: null, loading: false };
  }

  return { patterns, loading };
}
