"use client";

import { useEffect, useState } from "react";

interface MemoryStatus {
  enabled: boolean;
  local: boolean;
  source: string;
  factCount: number;
}

/**
 * Subtle connection status for the coach's persistent memory layer.
 * Embedded in MemoryCard — not a global overlay.
 */
export function MemoryStatusIndicator({
  containerTag,
}: {
  containerTag?: string;
}) {
  const [status, setStatus] = useState<MemoryStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      const params = new URLSearchParams();
      if (containerTag) params.set("containerTag", containerTag);
      fetch(`/api/memory/status?${params}`)
        .then((r) => r.json())
        .then((json: MemoryStatus) => {
          if (!cancelled) setStatus(json);
        })
        .catch(() => {
          if (!cancelled) setStatus({ enabled: false, local: false, source: "", factCount: 0 });
        });
    };

    load();
    const iv = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [containerTag]);

  if (!status) return null;

  const online = status.enabled;
  const local = status.local;
  const host = status.source.replace(/^https?:\/\//, "") || "offline";

  return (
    <span className="text-[8px] font-mono" style={{ color: "var(--color-text-faint)" }}>
      {online ? (
        <>
          {local ? "🟢 Local memory" : "Memory active"}
          {host && <span> · {host}</span>}
          {status.factCount > 0 && <span> · {status.factCount} facts</span>}
        </>
      ) : (
        "Memory offline — coach starts fresh each session"
      )}
    </span>
  );
}
