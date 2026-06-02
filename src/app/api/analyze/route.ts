import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ai } from "@eazo/sdk";
import { createDebtSession } from "@/lib/db/queries";
import type {
  AnalyzeBodyRequest,
  DebtAnalysis,
} from "@/lib/types";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  // Guest-first: AI score runs for everyone.
  // DB persistence only when the user is authenticated.
  const authResult = requireAuth(request);
  const userId = authResult.ok ? authResult.user.id : null;

  let body: AnalyzeBodyRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { stressors, faceAnalysis, hrvData, currentTime } = body;
  const now = currentTime ?? new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const stressorText = stressors
    .map((s) => `- ${s.type}${s.context ? ` (${s.context})` : ""}`)
    .join("\n");

  const faceText = faceAnalysis
    ? `Face scan results:
- Periorbital puffiness: ${faceAnalysis.periorbitalPuffiness}
- Skin perfusion: ${faceAnalysis.skinPerfusion}
- Eye clarity: ${faceAnalysis.eyeClarity}
- Inflammation: ${faceAnalysis.inflammation}
- AI summary: ${faceAnalysis.summary}`
    : "No face scan data available.";

  const hrvText = hrvData
    ? `Wearable data:
- HRV: ${hrvData.hrvDeltaPercent}% below personal baseline
- Resting HR: ${hrvData.restingHrDelta > 0 ? `+${hrvData.restingHrDelta}` : hrvData.restingHrDelta}bpm vs baseline
${hrvData.sleepStages ? `- Sleep: ${hrvData.sleepStages.deep}min deep, ${hrvData.sleepStages.rem}min REM, ${hrvData.sleepStages.light}min light` : ""}`
    : "No wearable data available.";

  const systemPrompt = `You are a body recovery intelligence system. You analyze physiological signals and provide an honest, direct assessment of a person's current body state. 

Your tone: a knowledgeable friend who tells the truth. Direct. Specific. No judgment. No doctor-speak. No caveats. No "consult a physician."

Respond ONLY with valid JSON matching the schema provided.`;

  const userPrompt = `Current time: ${now}

Stressors reported:
${stressorText}

${faceText}

${hrvText}

Calculate and respond with JSON matching exactly this schema:
{
  "debtScore": <integer 0-100, weighted by stressor severity and HRV/face data>,
  "verdict": <string, 5-12 words, brutally honest one-line body state>,
  "recoveryTime": <string, specific clock time e.g. "6pm tonight" or "tomorrow morning">,
  "prescription": {
    "rightNow": <string, one specific immediate action, 10-20 words>,
    "thisMorning": <string, one specific action for the next 2-3 hours, 10-20 words>,
    "today": <string, one key insight about today's capacity, 10-20 words>,
    "avoid": <string, one specific thing to avoid today and why, 10-20 words>
  },
  "stressorBreakdown": [
    {
      "stressor": <string, label>,
      "points": <integer, contribution to debt score>,
      "insight": <string, 15-25 words of specific biological insight for this stressor>
    }
  ],
  "recoveryArc": {
    "dangerEnds": <ISO 8601 datetime string, when the acute recovery window ends>,
    "partialEnds": <ISO 8601 datetime string, when partial recovery ends>,
    "clearedAt": <ISO 8601 datetime string, when body is fully recovered>
  }
}

Rules:
- debtScore weights: alcohol is 25-35 pts, poor sleep 20-28 pts, hard training 15-22 pts, stress 10-18 pts, ill 20-30 pts. HRV data and face scan add 5-15 pts total if present.
- verdict examples: "Your body is working overtime right now." / "Significant debt. Listen to what your body's telling you." / "Your nervous system is still in repair mode."
- prescriptions should be ultra-specific — mention actual substances, times, actions. Not generic advice.
- stressorBreakdown should include face scan and HRV as separate entries if data was provided.`;

  let analysis: DebtAnalysis;

  try {
    const response = await ai.chat({
      model: "deepseek.v3.1",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1200,
    });

    const rawText = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(rawText);

    analysis = {
      debtScore: Math.min(100, Math.max(0, parsed.debtScore ?? 50)),
      verdict: parsed.verdict ?? "Your body is processing.",
      recoveryTime: parsed.recoveryTime ?? "later today",
      prescription: {
        rightNow:    parsed.prescription?.rightNow    ?? "Drink 500ml of water with electrolytes immediately.",
        thisMorning: parsed.prescription?.thisMorning ?? "Avoid caffeine for the next 2 hours — it will spike cortisol.",
        today:       parsed.prescription?.today       ?? "Your best focus window is mid-morning. Protect it.",
        avoid:       parsed.prescription?.avoid       ?? "Intense exercise. You will create more debt, not fitness.",
      },
      stressorBreakdown: (parsed.stressorBreakdown ?? []).map((item: Record<string, unknown>) => ({
        stressor: String(item.stressor ?? ""),
        points:   Number(item.points ?? 0),
        insight:  String(item.insight ?? ""),
        icon:     String(item.icon ?? "⚡"),
      })),
      recoveryArc: parsed.recoveryArc ?? {
        dangerEnds: new Date(Date.now() + 3 * 3600000).toISOString(),
        partialEnds: new Date(Date.now() + 6 * 3600000).toISOString(),
        clearedAt: new Date(Date.now() + 12 * 3600000).toISOString(),
      },
      confidenceLevel:
        faceAnalysis && hrvData
          ? "high"
          : faceAnalysis || hrvData
          ? "medium"
          : "low",
    };
  } catch {
    return NextResponse.json(
      { error: "AI analysis failed. Please try again." },
      { status: 500 }
    );
  }

  // Persist to DB only when authenticated
  if (userId) {
    try {
      const session = await createDebtSession({
        userId,
        stressors,
        faceAnalysis: faceAnalysis ?? undefined,
        hrvData: hrvData ?? undefined,
        debtScore: analysis.debtScore,
        verdict: analysis.verdict,
        recoveryTime: analysis.recoveryTime,
        prescription: analysis.prescription,
        stressorBreakdown: analysis.stressorBreakdown,
      });
      analysis.sessionId = Number(session.id);
    } catch {
      // Non-blocking — analysis still returned even if DB fails
    }
  }

  return NextResponse.json(analysis);
}
