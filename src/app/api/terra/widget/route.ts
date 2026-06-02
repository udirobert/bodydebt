import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const maxDuration = 15;

const TERRA_API_BASE = "https://api.tryterra.co/v2";

/**
 * POST /api/terra/widget
 *
 * Generates a Terra widget session URL. The client opens this URL in a
 * popup or redirect — Terra handles the OAuth flow for whichever provider
 * the user picks (Garmin, Fitbit, Apple Health, WHOOP, Oura, etc.)
 *
 * Body: { referenceId?: string }
 * Returns: { url: string, sessionId: string }
 */
export async function POST(request: NextRequest) {
  const devId = process.env.TERRA_DEV_ID;
  const apiKey = process.env.TERRA_API_KEY;
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  // Graceful degradation — if Terra keys not configured, signal clearly
  if (!devId || !apiKey) {
    return NextResponse.json(
      { error: "TERRA_NOT_CONFIGURED", message: "Terra API credentials not set up yet." },
      { status: 503 }
    );
  }

  let referenceId: string;
  try {
    const body = await request.json().catch(() => ({}));
    referenceId = body.referenceId ?? randomUUID();
  } catch {
    referenceId = randomUUID();
  }

  const successUrl = `${appBaseUrl}/api/terra/callback?status=success`;
  const failureUrl = `${appBaseUrl}/api/terra/callback?status=failure`;

  const res = await fetch(`${TERRA_API_BASE}/auth/generateWidgetSession`, {
    method: "POST",
    headers: {
      "dev-id": devId,
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      language: "en",
      reference_id: referenceId,
      auth_success_redirect_url: successUrl,
      auth_failure_redirect_url: failureUrl,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[terra/widget] Terra API error:", res.status, err);
    return NextResponse.json(
      { error: "TERRA_API_ERROR", message: "Failed to generate widget session." },
      { status: 502 }
    );
  }

  const data = await res.json();
  return NextResponse.json({
    url: data.url as string,
    sessionId: data.session_id as string,
  });
}
