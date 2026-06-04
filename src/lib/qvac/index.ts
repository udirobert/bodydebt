export interface HealthCoachInput {
  stressScore: number;
  isHealthy: boolean;
  features: {
    eyeFatigue: boolean;
    browTension: boolean;
    mouthTension: boolean;
  };
  stressors: string[];
}

import { fork } from "node:child_process";
import path from "node:path";

export function buildPrompt(input: HealthCoachInput): string {
  return `You are a health recovery coach. A user completed a ZK-verified facial stress scan.

Verified data:
- Stress score: ${input.stressScore}/100
- ZK result: ${input.isHealthy ? "Within healthy range" : "Elevated stress"}
- Eye fatigue: ${input.features.eyeFatigue ? "Yes" : "No"}
- Brow tension: ${input.features.browTension ? "Yes" : "No"}
- Reported stressors: ${input.stressors.join(", ") || "None"}

Give 3 specific, actionable recovery tips in 2-3 sentences total. Direct, no caveats.`;
}

export function buildFallbackPrompt(input: HealthCoachInput): string {
  return buildPrompt(input);
}

export interface ProgressEvent {
  status: string;
  loaded?: number;
  total?: number;
  percent?: number;
}

/**
 * Runs QVAC Edge AI inference by spawning a standalone worker process.
 * Uses child_process.fork() to avoid bundling @qvac/sdk and its native deps.
 * Falls back to cloud AI if the worker is unavailable or fails.
 */
export async function runHealthCoach(
  input: HealthCoachInput,
  onProgress?: (progress: ProgressEvent) => void
): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    const workerPath = path.resolve(process.cwd(), "scripts/qvac-worker.mjs");

    // QVAC native modules link against OpenSSL — the SDK may expect it at
    // /opt/homebrew/opt/openssl@3/lib/ but on some systems it's installed
    // at /usr/local/opt/openssl@3/lib/. Set DYLD_FALLBACK_LIBRARY_PATH so
    // the dynamic linker finds it either way.
    const child = fork(workerPath, [JSON.stringify(input)], {
      stdio: ["pipe", "pipe", "pipe", "ipc"],
      env: {
        ...process.env,
        DYLD_FALLBACK_LIBRARY_PATH: [
          process.env.DYLD_FALLBACK_LIBRARY_PATH,
          "/opt/homebrew/opt/openssl@3/lib",
          "/usr/local/opt/openssl@3/lib",
          "/opt/homebrew/lib",
          "/usr/local/lib",
          "/usr/lib",
        ]
          .filter(Boolean)
          .join(":"),
      },
    });

    let result: string | null = null;
    let buffer = "";

    child.stdout?.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.event === "progress") {
            onProgress?.(msg.data as ProgressEvent);
          } else if (msg.event === "result") {
            result = msg.data.advice;
          }
        } catch {
          // skip malformed lines
        }
      }
    });

    // Log worker stderr for diagnostics
    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) console.warn("[QVAC worker stderr]", text);
    });

    child.on("close", (_code) => {
      resolve(result);
    });

    child.on("error", (err) => {
      console.warn("QVAC worker failed to start:", err.message);
      resolve(null);
    });

    // Safety timeout: kill worker after 120s
    setTimeout(() => {
      if (!child.killed) {
        child.kill();
      }
      resolve(result);
    }, 120_000);
  });
}
