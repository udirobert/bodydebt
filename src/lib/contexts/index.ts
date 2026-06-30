import type { RecoveryMode } from "@/lib/types";
import type { RecoveryContextConfig } from "./types";
import { personalContext } from "./personal";
import { footballContext } from "./football";

const REGISTRY: Record<RecoveryMode, RecoveryContextConfig> = {
  personal: personalContext,
  football: footballContext,
};

export function getContextConfig(mode: RecoveryMode): RecoveryContextConfig {
  return REGISTRY[mode] ?? personalContext;
}

export function getAllContexts(): RecoveryContextConfig[] {
  return Object.values(REGISTRY);
}

export type { RecoveryContextConfig } from "./types";
