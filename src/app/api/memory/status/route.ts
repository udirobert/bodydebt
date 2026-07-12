import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMemoryContext, isMemoryEnabled } from "@/lib/supermemory";

/**
 * GET /api/memory/status?containerTag=...
 *
 * Lightweight health check for Supermemory — used by MemoryStatusIndicator.
 */
export async function GET(request: NextRequest) {
  const baseURL = process.env.SUPERMEMORY_BASE_URL ?? "http://localhost:6767";
  const local = baseURL.includes("localhost") || baseURL.includes("127.0.0.1");

  if (!isMemoryEnabled) {
    return NextResponse.json({
      enabled: false,
      local,
      source: baseURL,
      factCount: 0,
    });
  }

  const session = await auth();
  const authedId = session?.user
    ? (session.user as { id?: string }).id ?? session.user.email ?? null
    : null;
  const containerTag = authedId ?? request.nextUrl.searchParams.get("containerTag");

  let factCount = 0;
  if (containerTag) {
    const ctx = await getMemoryContext(containerTag, "body debt recovery");
    if (ctx) {
      factCount =
        (ctx.profile?.split("\n").filter(Boolean).length ?? 0) +
        (ctx.memories?.split("\n").filter(Boolean).length ?? 0);
    }
  }

  return NextResponse.json({
    enabled: true,
    local,
    source: baseURL,
    factCount,
  });
}
