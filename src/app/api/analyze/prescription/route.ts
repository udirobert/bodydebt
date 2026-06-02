import { NextRequest, NextResponse } from "next/server";
import { ai } from "@eazo/sdk";
import type { AnalyzeBodyRequest, StressorType } from "@/lib/types";
import { deterministicPrescription, computeScore } from "../score/route";

export const maxDuration = 25;

/**
 * POST /api/analyze/prescription
 *
 * Layer 3 — Full-context AI prescription.
 * Uses DeepSeek v3 with complete context.
 * Falls back to rule-based prescription if AI fails or times out.
 * Falls back further to Claude Haiku if DeepSeek fails.
 *
 * Target latency: 2s–5s
 */
export async function POST(request: NextRequest) {
  let body: AnalyzeBodyRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const base = computeScore(body);
  const stressorTypes = body.stressors.map(s => s.type) as StressorType[];

  const systemPrompt = `You are a body recovery intelligence system. Tone: a knowledgeable friend — specific, direct, no judgment, no medical caveats. Respond ONLY with valid JSON.`;

  const userPrompt = buildPrescriptionPrompt(body, base.debtScore);

  // Try primary model (DeepSeek) then fallback (Haiku)
  for (const model of ["deepseek.v3.1", "anthropic.claude-3-5-haiku"] as const) {
    try {
      const response = await ai.chat({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 600,
      });

      const raw    = response.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);

      const p = parsed.prescription ?? parsed;

      // Validate each field — fall through to fallback if any are missing
      const rightNow    = typeof p.rightNow    === "string" && p.rightNow.length    > 5 ? p.rightNow    : null;
      const thisMorning = typeof p.thisMorning === "string" && p.thisMorning.length > 5 ? p.thisMorning : null;
      const today       = typeof p.today       === "string" && p.today.length       > 5 ? p.today       : null;
      const avoid       = typeof p.avoid       === "string" && p.avoid.length       > 5 ? p.avoid       : null;

      if (!rightNow || !thisMorning || !today || !avoid) throw new Error("Incomplete prescription fields");

      return NextResponse.json({
        prescription: { rightNow, thisMorning, today, avoid },
        _layer: "ai_prescription",
        _model: model,
      });

    } catch {
      // Try next model in chain
      continue;
    }
  }

  // Both models failed — return deterministic prescription
  return NextResponse.json({
    prescription: deterministicPrescription(stressorTypes, base.debtScore),
    _layer: "deterministic_fallback",
  });
}

function buildPrescriptionPrompt(body: AnalyzeBodyRequest, score: number): string {
  const { stressors, faceAnalysis, hrvData, currentTime } = body;
  const now = currentTime ?? new Date().toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  const stressorText = stressors
    .map(s => `- ${s.type}${s.context ? ` (${s.context})` : ""}`)
    .join("\n");

  const faceText = faceAnalysis
    ? `Face: ${faceAnalysis.inflammation} inflammation, ${faceAnalysis.eyeClarity} eye clarity, ${faceAnalysis.skinPerfusion} skin perfusion`
    : "Face scan: not available";

  const hrvText = hrvData
    ? `HRV: ${hrvData.hrvDeltaPercent}% from baseline, resting HR ${hrvData.restingHrDelta > 0 ? "+" : ""}${hrvData.restingHrDelta}bpm`
    : "Wearable: not available";

  return `Debt score: ${score}/100
Current time: ${now}
Stressors:
${stressorText}
${faceText}
${hrvText}

Generate 4 specific prescriptions for today. Respond with:
{
  "prescription": {
    "rightNow": <10-20 words, one immediate action mentioning specific substance/amount/time>,
    "thisMorning": <10-20 words, one action for the next 2-3 hours, specific>,
    "today": <10-20 words, honest assessment of today's capacity with one key action>,
    "avoid": <10-20 words, one specific thing to avoid today and the biological reason>
  }
}

Rules: reference actual times, substances, quantities. Not generic. No "stay hydrated" — say "500ml water with electrolytes." No medical caveats.`;
}
