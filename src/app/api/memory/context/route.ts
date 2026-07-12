import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMemoryContext, isMemoryEnabled } from "@/lib/supermemory";

/**
 * GET /api/memory/context?containerTag=...&q=...
 *
 * Returns the user's Supermemory profile + relevant memories.
 * Used by the UI to show "Your coach remembers:" facts.
 *
 * When authenticated, uses userId as containerTag (stable across devices).
 * Falls back to the provided containerTag (anonymousId) for guests.
 */
export async function GET(request: NextRequest) {
  if (!isMemoryEnabled) {
    return NextResponse.json({ enabled: false, profile: "", memories: [] });
  }

  // Prefer authenticated userId over anonymous containerTag
  const session = await auth();
  const authedId = session?.user
    ? (session.user as { id?: string }).id ?? session.user.email ?? null
    : null;

  const containerTag = authedId ?? request.nextUrl.searchParams.get("containerTag");
  const q = request.nextUrl.searchParams.get("q") ?? "body debt recovery";

  if (!containerTag) {
    return NextResponse.json(
      { error: "containerTag is required" },
      { status: 400 },
    );
  }

  const ctx = await getMemoryContext(containerTag, q);
  if (!ctx) {
    return NextResponse.json({ enabled: true, profile: "", memories: [] });
  }

  const memoryLines = ctx.memories.split("\n").filter(Boolean);
  return NextResponse.json({
    enabled: true,
    profile: ctx.profile,
    memories: memoryLines,
  });
}
