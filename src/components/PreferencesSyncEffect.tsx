"use client";

import { usePreferencesSync } from "@/hooks/usePreferencesSync";
import { useSquadSync } from "@/hooks/useSquadSync";

/**
 * Mounts the preferences + squad sync hooks inside the client provider tree.
 * Handles: loading DB preferences/squad on sign-in, saving them to DB
 * (debounced), and migrating guest memory to userId.
 */
export function PreferencesSyncEffect() {
  usePreferencesSync();
  useSquadSync();
  return null;
}
