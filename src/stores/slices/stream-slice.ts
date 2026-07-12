import type { StateCreator } from "zustand";
import type { ZKProofResult } from "@/lib/types";

// Agent event state for live multi-agent UI
export interface AgentEventState {
  agent: string;
  description: string;
  status: "pending" | "active" | "done" | "error";
  durationMs?: number;
  tokens?: string;
}

export interface AgentProgress {
  status: string;
  percent?: number;
  loaded?: number;
  total?: number;
}

export interface MemoryRecallState {
  factCount: number;
  preview: string;
  source: string;
  hasHistory: boolean;
  recalled: boolean;
}

/**
 * Stream slice — ephemeral runtime state that is NEVER persisted.
 *
 * Owns: ZK proof result (intentionally excluded from persistence per AGENTS.md),
 * live agent events during analysis, and agent model download progress.
 *
 * These fields describe the current in-flight analysis pipeline, not durable
 * user data. They reset on page refresh.
 */
export interface StreamSlice {
  // ZK proof result (ephemeral — not persisted)
  zkProof: ZKProofResult | null;
  setZkProof: (proof: ZKProofResult | null) => void;

  // Agent events (live during analysis — not persisted)
  agentEvents: AgentEventState[];
  setAgentEvents: (events: AgentEventState[]) => void;

  // Agent model download progress (live during analysis — not persisted)
  agentProgress: AgentProgress | null;
  setAgentProgress: (progress: AgentProgress | null) => void;

  // Supermemory recall result from SSE (live during analysis — not persisted)
  memoryRecall: MemoryRecallState | null;
  setMemoryRecall: (recall: MemoryRecallState | null) => void;

  /** Example session — ephemeral, never persisted */
  previewMode: boolean;
  setPreviewMode: (active: boolean) => void;

  resetStream: () => void;
}

/** Re-exported for consumers that import the type from the store. */
export type { AgentEventState as StoreAgentEventState };

export const createStreamSlice: StateCreator<
  StreamSlice,
  [],
  [],
  StreamSlice
> = (set) => ({
  zkProof: null,
  setZkProof: (proof) => set({ zkProof: proof }),

  agentEvents: [],
  setAgentEvents: (events) => set({ agentEvents: events }),

  agentProgress: null,
  setAgentProgress: (progress) => set({ agentProgress: progress }),

  memoryRecall: null,
  setMemoryRecall: (recall) => set({ memoryRecall: recall }),

  previewMode: false,
  setPreviewMode: (active) => set({ previewMode: active }),

  resetStream: () => set({
    zkProof: null,
    agentEvents: [],
    agentProgress: null,
    memoryRecall: null,
    previewMode: false,
  }),
});
