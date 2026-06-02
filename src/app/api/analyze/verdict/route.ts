import { NextRequest, NextResponse } from "next/server";
import { ai } from "@eazo/sdk";
import type { AnalyzeBodyRequest } from "@/lib/types";
import { computeScore } from "../score/route";

export const maxDuration = 15;

/**
 * POST /api/analyze/verdict
 *
 * Layer 2 — Fast AI verdict + recovery arc.
 * Uses Claude Haiku (fast, cheap, reliable) with a minimal prompt.
 * Only receives: score, stressor types, wake time, current time.
 * Falls back to deterministic strings if AI fails.
 *
 * Target latency: 800ms–1.5s
 */
export async function POST(request: NextRequest) {
  let body: AnalyzeBodyRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Always have deterministic result as fallback
  const base = computeScore(body);

  try {
    const { stressors, currentTime } = body;
    const now = currentTime ?? new Date().toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true,
    });

    const stressorList = stressors.map(s =>
      `${s.type}${s.context ? ` (${s.context})` : ""}`
    ).join(", ");

    const prompt = `Body debt score: ${base.debtScore}/100
Stressors: ${stressorList}
Current time: ${now}
HRV: ${body.hrvData ? `${body.hrvData.hrvDeltaPercent}% from baseline` : "not available"}

Write a body state verdict and recovery timeline. Respond with valid JSON only:
{
  "verdict": <string, 6-12 words, blunt honest one-liner about their body state right now>,
  "recoveryTime": <string, specific clock time like "6pm tonight" or "tomorrow morning 8am">,
  "recoveryArc": {
    "dangerEnds": <ISO 8601 datetime>,
    "partialEnds": <ISO 8601 datetime>,
    "clearedAt": <ISO 8601 datetime>
  }
}

Tone: a knowledgeable friend. Specific. No hedging. No "consult a doctor."`;

    const response = await ai.chat({
      model: "anthropic.claude-3-5-haiku",
      messages: [
        { role: "system", content: "You are a body recovery intelligence system. Respond only with valid JSON." },
        { role: "user",   content: prompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
    });

    const raw    = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      verdict:     typeof parsed.verdict === "string" ? parsed.verdict : base.verdict,
      recoveryTime: typeof parsed.recoveryTime === "string" ? parsed.recoveryTime : base.recoveryTime,
      recoveryArc: parsed.recoveryArc ?? base.recoveryArc,
      _layer: "ai_verdict",
      _model: "claude-3-5-haiku",
    });

  } catch {
    // Fallback — deterministic values from Layer 1
    return NextResponse.json({
      verdict:     base.verdict,
      recoveryTime: base.recoveryTime,
      recoveryArc: base.recoveryArc,
      _layer: "deterministic_fallback",
    });
  }
}
