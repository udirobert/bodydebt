import { NextRequest, NextResponse } from "next/server";
import type { HRVData } from "@/lib/types";

export const maxDuration = 20;

const TERRA_API_BASE = "https://api.tryterra.co/v2";

/**
 * GET /api/terra/data?terraUserId=...
 *
 * Polls Terra's REST API for today's sleep + HRV data on behalf of a
 * connected user. Called by the HRV screen after successful OAuth.
 *
 * Returns an HRVData object in Orbura's schema, or an error.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const terraUserId = searchParams.get("terraUserId");

  if (!terraUserId) {
    return NextResponse.json({ error: "terraUserId required" }, { status: 400 });
  }

  const devId = process.env.TERRA_DEV_ID;
  const apiKey = process.env.TERRA_API_KEY;

  if (!devId || !apiKey) {
    return NextResponse.json(
      { error: "TERRA_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  // Fetch yesterday's sleep (Terra uses UTC dates; sleep sessions span midnight)
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];

  const sleepRes = await fetch(
    `${TERRA_API_BASE}/sleep?user_id=${encodeURIComponent(terraUserId)}&start_date=${yesterday}&end_date=${today}&to_webhook=false`,
    {
      headers: {
        "dev-id": devId,
        "x-api-key": apiKey,
      },
    }
  );

  if (!sleepRes.ok) {
    const errText = await sleepRes.text();
    console.error("[terra/data] Terra sleep fetch failed:", sleepRes.status, errText);
    return NextResponse.json(
      { error: "Failed to fetch sleep data from Terra" },
      { status: 502 }
    );
  }

  const sleepJson = await sleepRes.json();
  const entries: unknown[] = sleepJson.data ?? [];

  if (entries.length === 0) {
    return NextResponse.json({ error: "NO_SLEEP_DATA", message: "No sleep data found for last night." }, { status: 404 });
  }

  // Most recent sleep session first
  const entry = entries[0] as Record<string, unknown>;
  const hrData = entry.heart_rate_data as Record<string, unknown> | undefined;
  const sleepData = entry.sleep_durations_data as Record<string, unknown> | undefined;
  const asleepData = sleepData?.asleep as Record<string, unknown> | undefined;

  const avgHrvRmssd   = (hrData?.avg_hrv_rmssd as number | undefined) ?? null;
  const avgRestingHr  = (hrData?.avg_resting_heart_rate as number | undefined) ?? null;
  const deepSecs      = (asleepData?.duration_deep_sleep_state_seconds as number | undefined) ?? null;
  const remSecs       = (asleepData?.duration_REM_sleep_state_seconds as number | undefined) ?? null;
  const lightSecs     = (asleepData?.duration_light_sleep_state_seconds as number | undefined) ?? null;

  // Convert to Orbura's HRVData schema
  // HRV delta: we compute vs population average (65ms RMSSD is roughly healthy adult baseline)
  // A real baseline would come from the user's own 14-day rolling average stored in our DB
  const populationBaselineRmssd = 65;
  const hrvDeltaPercent = avgHrvRmssd !== null
    ? Math.round(((avgHrvRmssd - populationBaselineRmssd) / populationBaselineRmssd) * 100)
    : -20; // conservative estimate if HRV not available

  // Resting HR delta vs population average (60 bpm)
  const populationBaselineHr = 60;
  const restingHrDelta = avgRestingHr !== null
    ? Math.round(avgRestingHr - populationBaselineHr)
    : 5;

  const hrvData: HRVData = {
    hrvDeltaPercent,
    restingHrDelta,
    ...(deepSecs !== null || remSecs !== null || lightSecs !== null
      ? {
          sleepStages: {
            deep:  deepSecs  !== null ? Math.round(deepSecs  / 60) : 45,
            rem:   remSecs   !== null ? Math.round(remSecs   / 60) : 60,
            light: lightSecs !== null ? Math.round(lightSecs / 60) : 180,
          },
        }
      : {}),
  };

  return NextResponse.json({
    hrvData,
    provider: entry.provider ?? "wearable",
    rawHrvRmssd: avgHrvRmssd,
    rawRestingHr: avgRestingHr,
  });
}
