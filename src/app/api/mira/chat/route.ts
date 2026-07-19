import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { buildOrburaSystemPrompt } from "@/lib/mira/persona";
import path from "node:path";

export const maxDuration = 60;

/**
 * POST /api/mira/chat
 *
 * Streams Mira's reply as Server-Sent Events. Uses the QVAC local LLM
 * (Qwen3-1.7B) for on-device inference. Falls back to a deterministic
 * reply if the worker is unavailable.
 *
 * Request body:
 *   { message: string, history?: {role, content}[], context?: {debtScore, phase, prescription} }
 *
 * SSE events:
 *   event: token   data: { text: string }
 *   event: done    data: { full: string }
 *   event: error   data: { error: string }
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  // Guest-first: allow unauthenticated access in standalone mode
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _userId = authResult.ok ? authResult.user.id : null;

  let body: {
    message: string;
    history?: { role: string; content: string }[];
    context?: { debtScore?: number; phase?: string; prescription?: string | null };
  };
  try {
    body = await request.json();
  } catch {
    return new Response(
      'event: error\ndata: {"error":"Invalid request body"}\n\n',
      { headers: { "Content-Type": "text/event-stream" }, status: 400 }
    );
  }

  const message = String(body.message || "").slice(0, 500);
  if (!message) {
    return new Response(
      'event: error\ndata: {"error":"Missing message"}\n\n',
      { headers: { "Content-Type": "text/event-stream" }, status: 400 }
    );
  }

  // Safety checks — same patterns as Sukari
  const lower = message.toLowerCase();
  const dosingAsk = /how much insulin|units of|dose my|bolus|basal rate|prescribe/.test(lower);
  if (dosingAsk) {
    return sseReply(
      "I can't help with medication or dosing. Ask your care team for that — I can only help with your recovery.",
    );
  }

  const emergency = /chest pain|can't breathe|unconscious|seizure|suicide|overdose/.test(lower);
  if (emergency) {
    return sseReply(
      "This sounds urgent. Contact your care team or local emergency services now. I can only support everyday recovery.",
    );
  }

  const system = buildOrburaSystemPrompt(body.context);
  const history = (body.history || []).slice(-6);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      // Try QVAC local LLM
      try {
        const workerPath = path.resolve(process.cwd(), "scripts/qvac-chat-worker.mjs");
        const cpModule = "node:child_process";
        const cp = await import(/* webpackIgnore: true */ cpModule);

        const workerArg = JSON.stringify({ system, message, history });

        const isBareAvailable = await import("node:child_process").then((c) => {
          try {
            c.execSync("which bare", { stdio: "ignore" });
            return true;
          } catch {
            return false;
          }
        }).catch(() => false);

        const runtime = isBareAvailable ? "bare" : process.execPath;
        const child = cp.spawn(runtime, [workerPath, workerArg], {
          stdio: ["pipe", "pipe", "pipe"],
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

        let buffer = "";
        let full = "";
        let resolved = false;

        child.stdout?.on("data", (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const msg = JSON.parse(line);
              if (msg.event === "token" && msg.data?.text) {
                full += msg.data.text;
                send("token", { text: msg.data.text });
              } else if (msg.event === "done") {
                resolved = true;
                send("done", { full: msg.data?.full || full });
                controller.close();
              } else if (msg.event === "error") {
                resolved = true;
                // Fall through to fallback
              }
            } catch {
              // skip malformed
            }
          }
        });

        child.stderr?.on("data", () => {
          // suppress worker stderr
        });

        child.on("close", () => {
          if (!resolved) {
            // Worker ended without done event — send fallback
            if (full) {
              send("done", { full });
            } else {
              sendFallback(send, body.context);
            }
            controller.close();
          }
        });

        child.on("error", () => {
          if (!resolved) {
            sendFallback(send, body.context);
            controller.close();
          }
        });

        // Timeout
        setTimeout(() => {
          if (!resolved && !child.killed) {
            child.kill();
          }
        }, 45_000);
      } catch {
        // QVAC unavailable — send fallback
        sendFallback(send, body.context);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function sseReply(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`event: token\ndata: ${JSON.stringify({ text })}\n\n`));
      controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ full: text })}\n\n`));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function sendFallback(
  send: (event: string, data: unknown) => void,
  context?: { phase?: string; prescription?: string | null },
): void {
  const reply = context?.prescription
    ? `Your recovery plan is ready. Start with: ${context.prescription.slice(0, 100)}`
    : "Focus on one rest step right now. Your body is asking for attention, not pressure.";
  send("token", { text: reply });
  send("done", { full: reply });
}
