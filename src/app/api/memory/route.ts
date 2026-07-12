import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logAction, forgetMemory, forgetAll, isMemoryEnabled } from "@/lib/supermemory";

/**
 * POST /api/memory
 *
 * Stores a user action or event to Supermemory Local.
 * Fire-and-forget — never blocks on memory failures.
 *
 * When authenticated, uses userId as containerTag (stable across devices).
 * Falls back to body.containerTag (anonymousId) for guests.
 *
 * Body: { content: string, event_type: string, containerTag?: string }
 */
export async function POST(request: NextRequest) {
  let body: { content?: string; event_type?: string; containerTag?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { content, event_type } = body;
  if (!content) {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400 },
    );
  }

  // Prefer authenticated userId over anonymous containerTag
  const session = await auth();
  const authedId = session?.user
    ? (session.user as { id?: string }).id ?? session.user.email ?? null
    : null;
  const containerTag = authedId ?? body.containerTag;

  if (!containerTag) {
    return NextResponse.json(
      { error: "containerTag is required (authenticate or provide one)" },
      { status: 400 },
    );
  }

  if (!isMemoryEnabled) {
    return NextResponse.json({ ok: true, stored: false, reason: "disabled" });
  }

  // Fire-and-forget — memory must never block the UI
  logAction(containerTag, content, {
    event_type: event_type ?? "action",
  }).catch(() => {});

  return NextResponse.json({ ok: true, stored: true });
}

/**
 * DELETE /api/memory
 *
 * Forgets memories from Supermemory. Two modes:
 * - { containerTag, content } — forget a single memory by content match
 * - { containerTag, all: true } — forget ALL memories for this user
 *
 * When authenticated, uses userId as containerTag.
 *
 * Body: { containerTag?: string, content?: string, all?: boolean }
 */
export async function DELETE(request: NextRequest) {
  let body: { containerTag?: string; content?: string; all?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Prefer authenticated userId
  const session = await auth();
  const authedId = session?.user
    ? (session.user as { id?: string }).id ?? session.user.email ?? null
    : null;
  const containerTag = authedId ?? body.containerTag;

  if (!containerTag) {
    return NextResponse.json(
      { error: "containerTag is required" },
      { status: 400 },
    );
  }

  if (!isMemoryEnabled) {
    return NextResponse.json({ ok: true, forgotten: false, reason: "disabled" });
  }

  if (body.all) {
    const result = await forgetAll(containerTag);
    if (!result) {
      return NextResponse.json(
        { ok: false, error: "Forget operation failed" },
        { status: 500 },
      );
    }
    return NextResponse.json({
      ok: true,
      forgotten: true,
      count: result.count,
      summary: result.summary,
    });
  }

  if (!body.content) {
    return NextResponse.json(
      { error: "content is required when all is not true" },
      { status: 400 },
    );
  }

  const success = await forgetMemory(containerTag, body.content);
  return NextResponse.json({ ok: success, forgotten: success });
}
