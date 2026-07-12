"use client";

import { useEffect, useState, useCallback } from "react";
import { useEazo } from "@/lib/sdk/eazo-react";
import { useMemoryContainerTag } from "@/hooks/useMemoryContainerTag";

export interface MemoryFacts {
  enabled: boolean;
  profile: string;
  memories: string[];
}

/**
 * Fetches the user's Supermemory profile + relevant memories.
 * Shared by the dashboard memory card, opening screen, and
 * prescription "why this" callout.
 *
 * When authenticated, the server uses userId as containerTag (stable
 * across devices). For guests, falls back to anonymousId.
 *
 * Returns { enabled: false, ... } when Supermemory is not running
 * so callers can gracefully hide memory UI.
 *
 * `refetch` triggers a re-fetch (used after forget operations).
 */
export function useMemoryContext(query?: string): {
  data: MemoryFacts | null;
  loading: boolean;
  refetch: () => void;
} {
  const containerTag = useMemoryContainerTag();
  const authenticated = useEazo((s) => s.auth.authenticated);
  const [data, setData] = useState<MemoryFacts | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => {
    setLoading(true);
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    // Need either anonymousId (guest) or authentication (user)
    if (!containerTag && !authenticated) return;
    let cancelled = false;
    const q = query ?? "body debt recovery patterns";
    const params = new URLSearchParams({ q });
    if (!authenticated && containerTag) {
      params.set("containerTag", containerTag);
    }
    fetch(`/api/memory/context?${params}`)
      .then((r) => r.json())
      .then((json: MemoryFacts) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData({ enabled: false, profile: "", memories: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [containerTag, authenticated, query, nonce]);

  return { data, loading, refetch };
}
