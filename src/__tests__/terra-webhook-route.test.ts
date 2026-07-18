import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import { POST } from "@/app/api/terra/webhook/route";
import { db } from "@/lib/db/client";

const SIGNING_SECRET = "terra-route-secret";

function signPayload(body: string, timestamp?: number): string {
  const t = timestamp ?? Math.floor(Date.now() / 1000);
  const signedString = `${t}.${body}`;
  const v1 = createHmac("sha256", SIGNING_SECRET).update(signedString).digest("hex");
  return `t=${t},v1=${v1}`;
}

function makeSleepPayload(userId: string) {
  return JSON.stringify({
    type: "SLEEP",
    user: { user_id: userId },
    data: [
      {
        heart_rate_data: { avg_hrv_rmssd: 45, avg_resting_heart_rate: 58 },
        sleep_durations_data: {
          asleep: {
            duration_deep_sleep_state_seconds: 3600,
            duration_REM_sleep_state_seconds: 5400,
            duration_light_sleep_state_seconds: 18000,
          },
        },
      },
    ],
  });
}

vi.mock("@/lib/supermemory", () => ({
  isMemoryEnabled: false,
  logAction: vi.fn(),
}));

describe("POST /api/terra/webhook", () => {
  beforeEach(() => {
    process.env.TERRA_SIGNING_SECRET = SIGNING_SECRET;

    vi.spyOn(db, "select").mockImplementation(
      () =>
        ({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }) as unknown as ReturnType<typeof db.select>,
    );

    vi.spyOn(db, "update").mockImplementation(
      () =>
        ({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }) as unknown as ReturnType<typeof db.update>,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.TERRA_SIGNING_SECRET;
  });

  it("returns 200 for a valid SLEEP payload with correct signature", async () => {
    const body = makeSleepPayload("terra-user-1");
    const req = new Request("http://localhost:3000/api/terra/webhook", {
      method: "POST",
      headers: { "terra-signature": signPayload(body) },
      body,
    });

    const res = await POST(req as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("received");
  });

  it("returns 401 when the signature header is missing", async () => {
    const body = makeSleepPayload("terra-user-2");
    const req = new Request("http://localhost:3000/api/terra/webhook", {
      method: "POST",
      body,
    });

    const res = await POST(req as never);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Missing signature");
  });

  it("returns 401 when the signature is invalid", async () => {
    const body = makeSleepPayload("terra-user-3");
    const req = new Request("http://localhost:3000/api/terra/webhook", {
      method: "POST",
      headers: { "terra-signature": "t=1234567890,v1=deadbeef" },
      body,
    });

    const res = await POST(req as never);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Invalid signature");
  });

  it("returns 400 for malformed JSON", async () => {
    const body = "not-json";
    const req = new Request("http://localhost:3000/api/terra/webhook", {
      method: "POST",
      headers: { "terra-signature": signPayload(body) },
      body,
    });

    const res = await POST(req as never);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid JSON");
  });

  it("ignores payloads without a user_id and still returns 200", async () => {
    const body = JSON.stringify({ type: "SLEEP" });
    const req = new Request("http://localhost:3000/api/terra/webhook", {
      method: "POST",
      headers: { "terra-signature": signPayload(body) },
      body,
    });

    const res = await POST(req as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ignored");
    expect(data.reason).toBe("no user_id");
  });

  it("processes SLEEP data and updates the Terra connection", async () => {
    const body = makeSleepPayload("terra-user-4");
    const req = new Request("http://localhost:3000/api/terra/webhook", {
      method: "POST",
      headers: { "terra-signature": signPayload(body) },
      body,
    });

    const res = await POST(req as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("received");
    expect(db.update).toHaveBeenCalled();
  });
});
