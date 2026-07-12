import { describe, it, expect, beforeEach } from "vitest";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { MEMORY_DEMO_ANALYSIS } from "@/lib/memory-demo-data";

describe("preview mode", () => {
  beforeEach(() => {
    useBodyDebtStore.getState().exitPreview();
    useBodyDebtStore.getState().resetSession();
    useBodyDebtStore.setState({ previewMode: false });
  });

  it("loads example data without changing anonymousId", () => {
    const beforeId = useBodyDebtStore.getState().anonymousId;
    useBodyDebtStore.getState().enterPreview();

    const state = useBodyDebtStore.getState();
    expect(state.previewMode).toBe(true);
    expect(state.anonymousId).toBe(beforeId);
    expect(state.analysis?.debtScore).toBe(MEMORY_DEMO_ANALYSIS.debtScore);
  });

  it("restores backed-up session on exit", () => {
    useBodyDebtStore.setState({
      analysis: {
        ...MEMORY_DEMO_ANALYSIS,
        debtScore: 12,
        verdict: "User session",
      },
      selectedStressors: [{ type: "sleep" }],
    });

    useBodyDebtStore.getState().enterPreview();
    expect(useBodyDebtStore.getState().analysis?.verdict).toBe(MEMORY_DEMO_ANALYSIS.verdict);

    useBodyDebtStore.getState().exitPreview();
    expect(useBodyDebtStore.getState().previewMode).toBe(false);
    expect(useBodyDebtStore.getState().analysis?.debtScore).toBe(12);
    expect(useBodyDebtStore.getState().analysis?.verdict).toBe("User session");
  });
});
