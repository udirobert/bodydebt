import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/google-fit/auth
 *
 * Generates the Google OAuth2 authorization URL and redirects the user.
 * Gated behind GOOGLE_FIT_CLIENT_ID — if absent, returns 503.
 *
 * Scopes requested (read-only, free tier):
 *   - fitness.sleep.read
 *   - fitness.heart_rate.read
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_FIT_CLIENT_ID;
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  if (!clientId) {
    return NextResponse.json({ error: "GOOGLE_FIT_NOT_CONFIGURED" }, { status: 503 });
  }

  const redirectUri = `${appBaseUrl}/api/google-fit/callback`;
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state") ?? crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/fitness.sleep.read",
      "https://www.googleapis.com/auth/fitness.heart_rate.read",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
