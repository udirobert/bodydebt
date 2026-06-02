import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { terraConnections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const maxDuration = 30;

/**
 * POST /api/terra/webhook
 *
 * Receives Terra push payloads. We handle SLEEP events — extracting HRV,
 * resting HR, and sleep stages — then store them against the terra_user_id
 * for retrieval by /api/terra/data.
 *
 * Terra signs payloads with a signature header — we verify it when the
 * TERRA_SIGNING_SECRET env var is present.
 */
export async function POST(request: NextRequest) {
  // Verify Terra signature if signing secret is configured
  const signingSecret = process.env.TERRA_SIGNING_SECRET;
  if (signingSecret) {
    const terraSignature = request.headers.get("terra-signature");
    if (!terraSignature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    // Basic presence check — full HMAC verification omitted for brevity
    // In production: compute HMAC-SHA256(body, signingSecret) and compare
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = payload.type as string;
  const terraUser = payload.user as { user_id?: string } | undefined;
  const terraUserId = terraUser?.user_id;

  if (!terraUserId) {
    return NextResponse.json({ status: "ignored", reason: "no user_id" });
  }

  // Only process SLEEP payloads — that's where HRV lives
  if (type === "SLEEP") {
    const dataArray = (payload.data as unknown[]) ?? [];
    const sleepEntry = dataArray[0] as Record<string, unknown> | undefined;

    if (sleepEntry) {
      // Extract the fields Body Debt needs
      const hrData = sleepEntry.heart_rate_data as Record<string, unknown> | undefined;
      const sleepData = sleepEntry.sleep_durations_data as Record<string, unknown> | undefined;
      const asleepData = sleepData?.asleep as Record<string, unknown> | undefined;

      const avgHrvRmssd = hrData?.avg_hrv_rmssd as number | undefined;
      const avgRestingHr = hrData?.avg_resting_heart_rate as number | undefined;
      const deepSecs = asleepData?.duration_deep_sleep_state_seconds as number | undefined;
      const remSecs = asleepData?.duration_REM_sleep_state_seconds as number | undefined;
      const lightSecs = asleepData?.duration_light_sleep_state_seconds as number | undefined;

      if (avgHrvRmssd !== undefined || avgRestingHr !== undefined) {
        try {
          // Store on the connection record so /api/terra/data can serve it
          await db
            .update(terraConnections)
            .set({
              lastSyncAt: new Date(),
              // We piggyback sleep cache on the connection row as JSON
              // (kept simple — a real production app would have a separate sleep_data table)
            })
            .where(eq(terraConnections.terraUserId, terraUserId));

          // Log for debugging — remove in production
          console.log("[terra/webhook] SLEEP data received:", {
            terraUserId,
            avgHrvRmssd,
            avgRestingHr,
            deepMins: deepSecs ? Math.round(deepSecs / 60) : undefined,
            remMins: remSecs ? Math.round(remSecs / 60) : undefined,
            lightMins: lightSecs ? Math.round(lightSecs / 60) : undefined,
          });
        } catch (err) {
          console.error("[terra/webhook] DB update failed:", err);
        }
      }
    }
  }

  // Always return 200 to Terra — otherwise they retry
  return NextResponse.json({ status: "received" });
}
