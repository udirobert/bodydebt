"use client";

import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { PREVIEW_MEMORY_CONTAINER } from "@/lib/preview-mode";

/**
 * Returns the Supermemory container tag for the current context.
 * Example sessions use the shared preview container — never the user's anonymousId.
 */
export function useMemoryContainerTag(): string | undefined {
  const previewMode = useBodyDebtStore((s) => s.previewMode);
  const anonymousId = useBodyDebtStore((s) => s.anonymousId);
  if (previewMode) return PREVIEW_MEMORY_CONTAINER;
  return anonymousId;
}
