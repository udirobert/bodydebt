import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPreferences, upsertPreferences } from "@/lib/db/queries";

/**
 * GET /api/user/preferences
 *
 * Returns the authenticated user's saved preferences (mode, orbPersonality,
 * locale, wakeTime, bedTime). Used on sign-in to sync settings across devices.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id ?? session.user.email ?? "";
  const prefs = await getPreferences(userId);

  if (!prefs) {
    return NextResponse.json({ ok: true, preferences: null });
  }

  return NextResponse.json({
    ok: true,
    preferences: {
      mode: prefs.mode,
      orbPersonality: prefs.orbPersonality,
      locale: prefs.locale,
      wakeTime: prefs.wakeTime,
      bedTime: prefs.bedTime,
    },
  });
}

/**
 * PUT /api/user/preferences
 *
 * Saves the user's preferences to the DB for cross-device sync.
 * Body: { mode?, orbPersonality?, locale?, wakeTime?, bedTime? }
 */
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id ?? session.user.email ?? "";

  let body: {
    mode?: string;
    orbPersonality?: string;
    locale?: string;
    wakeTime?: string | null;
    bedTime?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prefs = await upsertPreferences({
    userId,
    mode: body.mode,
    orbPersonality: body.orbPersonality,
    locale: body.locale,
    wakeTime: body.wakeTime ?? null,
    bedTime: body.bedTime ?? null,
  });

  return NextResponse.json({ ok: true, preferences: prefs });
}
