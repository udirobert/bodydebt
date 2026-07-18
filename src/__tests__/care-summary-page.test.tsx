import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/lib/sdk/eazo-react", () => ({
  useEazo: vi.fn(),
}));

vi.mock("@/components/AuthLockedTeaser", () => ({
  AuthLockedTeaser: ({ title, body }: { title: string; body: string }) => (
    <div data-testid="auth-locked">
      <p>{title}</p>
      <p>{body}</p>
    </div>
  ),
}));

import { useEazo } from "@/lib/sdk/eazo-react";
import { CareSummaryPage } from "@/products/care-companion/CareSummaryPage";

function setUser(user: { id: string; email: string } | null) {
  (useEazo as ReturnType<typeof vi.fn>).mockReturnValue(user);
}

function mockFetch(response: unknown, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: vi.fn().mockResolvedValue(response),
  });
}

describe("CareSummaryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows an auth teaser when the user is not signed in", () => {
    setUser(null);
    render(<CareSummaryPage />);
    expect(screen.getByTestId("auth-locked")).toBeDefined();
  });

  it("fetches and displays the patient summary", async () => {
    setUser({ id: "user-1", email: "patient@example.com" });
    mockFetch({
      ok: true,
      pendingInterventions: [{ id: "int-1", action: "Drink water", status: "pending", dueAt: new Date().toISOString() }],
      openEscalations: [{ id: "esc-1", reason: "Severe vomiting", status: "open", createdAt: new Date().toISOString() }],
      observations: [{ id: "obs-1", symptoms: ["nausea"], symptomSeverity: "mild", adherence: "taken_as_prescribed", checkInAt: new Date().toISOString() }],
    });

    render(<CareSummaryPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/care/patient/summary");
      expect(screen.getByText("Drink water")).toBeDefined();
      expect(screen.getByText("Severe vomiting")).toBeDefined();
      expect(screen.getByText(/nausea/)).toBeDefined();
    });
  });

  it("shows an error when the summary request fails", async () => {
    setUser({ id: "user-1", email: "patient@example.com" });
    mockFetch({ error: "summary failed" }, false);

    render(<CareSummaryPage />);

    await waitFor(() => {
      expect(screen.getByText("summary failed")).toBeDefined();
    });
  });
});
