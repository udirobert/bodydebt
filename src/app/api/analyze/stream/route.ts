import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createDebtSession } from "@/lib/db/queries";
import type { AnalyzeBodyRequest, DebtAnalysis } from "@/lib/types";
import { computeScore, deterministicPrescription } from "../score/route";
import { ai } from "@eazo/sdk";

export const maxDuration = 30;

/**
 * POST /api/analyze/stream
 *
 * Three-layer progressive analysis via Server-Sent Events.
 *
 * Event sequence (each is a complete JSON payload the client can render):
 *
 *   event: score        → Layer 1 result, emitted immediately (<5ms)
 *   event: verdict      → Layer 2 result, emitted when Haiku responds (~1-2s)
 *   event: prescription → Layer 3 result, emitted when DeepSeek responds (~3-5s)
 *   event: done         → Final merged result (same shape as /api/analyze)
 *   event: error        → Only emitted if all layers fail
 *
 * Layers 2 and 3 run in parallel. Each has its own fallback chain.
 * The client can render a progressively richer UI as each event arrives.
 */
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  const userId = authResult.ok ? authResult.user.id : null;

  let body: AnalyzeBodyRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body");
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function emit(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }

      // ── Layer 1: Deterministic — always instant ──────────────────────────
      const layer1 = computeScore(body);
      emit("score", {
        debtScore:         layer1.debtScore,
        stressorBreakdown: layer1.stressorBreakdown,
        systemScores:      layer1.systemScores,
        confidenceLevel:   layer1.confidenceLevel,
        confidenceTier:    layer1.confidenceTier,
        recoveryArc:       layer1.recoveryArc,
        verdict:           layer1.verdict,
        recoveryTime:      layer1.recoveryTime,
        prescription:      layer1.prescription,
        _layer: "deterministic",
      });

      // ── Layers 2 & 3: Run concurrently ───────────────────────────────────
      const [verdictResult, prescriptionResult] = await Promise.allSettled([
        fetchVerdict(body, layer1),
        fetchPrescription(body, layer1),
      ]);

      // Emit verdict as soon as it's ready
      const verdictData = verdictResult.status === "fulfilled"
        ? verdictResult.value
        : { verdict: layer1.verdict, recoveryTime: layer1.recoveryTime, recoveryArc: layer1.recoveryArc, _layer: "fallback" };
      emit("verdict", verdictData);

      // Emit prescription as soon as it's ready
      const prescriptionData = prescriptionResult.status === "fulfilled"
        ? prescriptionResult.value
        : { prescription: layer1.prescription, _layer: "fallback" };
      emit("prescription", prescriptionData);

      // ── Final merged result ───────────────────────────────────────────────
      const final: DebtAnalysis = {
        debtScore:         layer1.debtScore,
        stressorBreakdown: layer1.stressorBreakdown,
        systemScores:      layer1.systemScores,
        confidenceLevel:   layer1.confidenceLevel,
        confidenceTier:    layer1.confidenceTier,
        verdict:           verdictData.verdict     ?? layer1.verdict,
        recoveryTime:      verdictData.recoveryTime ?? layer1.recoveryTime,
        recoveryArc:       verdictData.recoveryArc  ?? layer1.recoveryArc,
        prescription:      prescriptionData.prescription ?? layer1.prescription,
      };

      // Persist to DB if authenticated (non-blocking)
      if (userId) {
        createDebtSession({
          userId,
          stressors:        body.stressors,
          faceAnalysis:     body.faceAnalysis ?? undefined,
          hrvData:          body.hrvData      ?? undefined,
          debtScore:        final.debtScore,
          verdict:          final.verdict,
          recoveryTime:     final.recoveryTime,
          prescription:     final.prescription,
          stressorBreakdown: final.stressorBreakdown,
        }).then((session) => {
          final.sessionId = Number(session.id);
        }).catch(() => {});
      }

      emit("done", final);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// ─── Layer 2: verdict + recovery arc ─────────────────────────────────────────

async function fetchVerdict(body: AnalyzeBodyRequest, layer1: ReturnType<typeof computeScore>) {
  const { stressors, hrvData, currentTime } = body;
  const now = currentTime ?? new Date().toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  const prompt = `Body debt score: ${layer1.debtScore}/100
Stressors: ${stressors.map(s => `${s.type}${s.context ? ` (${s.context})` : ""}`).join(", ")}
Current time: ${now}
HRV: ${hrvData ? `${hrvData.hrvDeltaPercent}% from baseline` : "not available"}

Respond with JSON only:
{
  "verdict": <string, 6-12 words, blunt honest one-liner about their body state>,
  "recoveryTime": <string, specific clock time like "6pm tonight">,
  "recoveryArc": {
    "dangerEnds": <ISO 8601>,
    "partialEnds": <ISO 8601>,
    "clearedAt": <ISO 8601>
  }
}`;

  for (const model of ["anthropic.claude-3-5-haiku", "deepseek.v3.1"] as const) {
    try {
      const res  = await ai.chat({
        model,
        messages: [
          { role: "system", content: "Body recovery intelligence. Respond with JSON only. No caveats." },
          { role: "user",   content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 250,
      });
      const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}");
      if (typeof parsed.verdict !== "string") throw new Error("bad shape");
      return {
        verdict:     parsed.verdict,
        recoveryTime: parsed.recoveryTime ?? layer1.recoveryTime,
        recoveryArc: parsed.recoveryArc  ?? layer1.recoveryArc,
        _layer: "ai_verdict",
        _model: model,
      };
    } catch { continue; }
  }
  throw new Error("All verdict models failed");
}

// ─── Layer 3: full prescription ───────────────────────────────────────────────

async function fetchPrescription(body: AnalyzeBodyRequest, layer1: ReturnType<typeof computeScore>) {
  const { stressors, faceAnalysis, hrvData, currentTime } = body;
  const now = currentTime ?? new Date().toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  const prompt = `Debt score: ${layer1.debtScore}/100. Time: ${now}.
Stressors: ${stressors.map(s => `${s.type}${s.context ? ` (${s.context})` : ""}`).join(", ")}
${faceAnalysis ? `Face: ${faceAnalysis.inflammation} inflammation, ${faceAnalysis.eyeClarity} clarity` : ""}
${hrvData ? `HRV: ${hrvData.hrvDeltaPercent}% from baseline` : ""}

Respond with JSON only:
{
  "prescription": {
    "rightNow":    <10-20 words, specific immediate action with quantity/substance>,
    "thisMorning": <10-20 words, specific action for next 2-3 hours>,
    "today":       <10-20 words, honest capacity assessment + one key action>,
    "avoid":       <10-20 words, one specific thing to avoid + biological reason>
  }
}

Rules: specific quantities, times, substances. No generic advice. No caveats.`;

  for (const model of ["deepseek.v3.1", "anthropic.claude-3-5-haiku"] as const) {
    try {
      const res  = await ai.chat({
        model,
        messages: [
          { role: "system", content: "Body recovery intelligence. JSON only. Specific. Direct. No caveats." },
          { role: "user",   content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
      });
      const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}");
      const p = parsed.prescription ?? parsed;
      if (!p.rightNow || !p.thisMorning || !p.today || !p.avoid) throw new Error("incomplete");
      return { prescription: p, _layer: "ai_prescription", _model: model };
    } catch { continue; }
  }

  // Both AI layers failed — deterministic fallback
  return {
    prescription: deterministicPrescription(stressors.map(s => s.type), layer1.debtScore),
    _layer: "deterministic_fallback",
  };
}

function errorResponse(msg: string) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(c) {
        c.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`));
        c.close();
      },
    }),
    { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } }
  );
}
