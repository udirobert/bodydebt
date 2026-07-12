import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserPatterns, formatPatternsForPrompt } from "@/lib/db/queries";

/**
 * GET /api/user/patterns
 *
 * Returns analyzed patterns from the user's debt session history.
 * Used by:
 *   - The AI agent prompt (to enrich prescriptions with historical context)
 *   - The MemoryCard UI (personalized greeting + streak awareness)
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id ?? session.user.email ?? "";
  const patterns = await getUserPatterns(userId);

  if (!patterns) {
    return NextResponse.json({ ok: true, patterns: null, promptContext: null });
  }

  return NextResponse.json({
    ok: true,
    patterns,
    promptContext: formatPatternsForPrompt(patterns),
  });
}
