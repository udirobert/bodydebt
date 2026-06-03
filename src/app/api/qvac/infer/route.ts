import { NextRequest, NextResponse } from "next/server";
import { runHealthCoach, buildFallbackPrompt } from "@/lib/qvac";
import type { HealthCoachInput } from "@/lib/qvac";
import { ai } from "@eazo/sdk";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let body: HealthCoachInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const qvacResult = await runHealthCoach(body);
  if (qvacResult) {
    return NextResponse.json({
      advice: qvacResult,
      source: "qvac-local",
      model: "llama-3.2-1b-inst-q4",
    });
  }

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
    return NextResponse.json({
      advice: response.choices[0]?.message?.content ?? "Rest and hydrate.",
      source: "eazo-cloud",
      model: "deepseek.v3.1",
    });
  } catch {
    return NextResponse.json({
      advice: "Focus on hydration and rest. Your body needs recovery time.",
      source: "fallback",
    });
  }
}
