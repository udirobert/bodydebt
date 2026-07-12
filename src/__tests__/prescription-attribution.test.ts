import { describe, it, expect } from "vitest";
import {
  attributePrescriptionLines,
  collectMemoryFacts,
} from "@/lib/supermemory/prescription-attribution";
import {
  AMNESIA_PRESCRIPTION,
  MEMORY_PRESCRIPTION,
  MEMORY_DEMO_FACTS,
} from "@/lib/memory-demo-data";

describe("attributePrescriptionLines", () => {
  it("marks memory-backed lines when facts overlap", () => {
    const facts = collectMemoryFacts("", MEMORY_DEMO_FACTS);
    const attr = attributePrescriptionLines(MEMORY_PRESCRIPTION, facts);

    expect(attr.thisMorning).toBe("memory");
    expect(attr.today).toBe("memory");
    expect(attr.avoid).toBe("memory");
  });

  it("marks all lines as new without memory corpus", () => {
    const attr = attributePrescriptionLines(AMNESIA_PRESCRIPTION, []);
    expect(Object.values(attr).every((v) => v === "new")).toBe(true);
  });
});
