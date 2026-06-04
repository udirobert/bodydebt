import { NextRequest } from "next/server";
import { runHealthCoach, buildFallbackPrompt } from "@/lib/qvac";
import type { HealthCoachInput } from "@/lib/qvac";
import { ai } from "@eazo/sdk";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  let body: HealthCoachInput;
  try {
    body = await request.json();
  } catch {
    return new Response(
      'event: error\ndata: {"error":"Invalid request body"}\n\n',
      { headers: { "Content-Type": "text/event-stream" }, status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      // Try QVAC local first
      const qvacResult = await runHealthCoach(body, (progress) => {
        send("progress", progress);
      });

      if (qvacResult) {
        send("result", {
          advice: qvacResult,
          source: "qvac-local",
          model: "llama-3.2-1b-inst-q4",
        });
        controller.close();
        return;
      }

      // Fallback: QVAC unavailable — try Eazo cloud AI
      send("progress", { status: "fallback", percent: 0 });

      try {
        ai.configure({ privateKey: process.env.EAZO_PRIVATE_KEY! });
        const response = await ai.chat({
          model: "deepseek.v3.1",
          messages: [
            { role: "system", content: "Health recovery coach. Direct, specific, no caveats." },
            { role: "user", content: buildFallbackPrompt(body) },
          ],
          max_tokens: 200,
        });
        send("result", {
          advice: response.choices[0]?.message?.content ?? "Rest and hydrate.",
          source: "eazo-cloud",
          model: "deepseek.v3.1",
        });
      } catch {
        send("result", {
          advice: "Focus on hydration and rest. Your body needs recovery time.",
          source: "fallback",
        });
      }

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
