import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createDebtSession } from "@/lib/db/queries";

export function registerLogStressorsTool(server: McpServer, userId: string) {
  server.tool(
    "log_stressors",
    "Log what stressors hit the user's body (alcohol, sleep, training, stress, illness) and generate a new debt score.",
    {
      stressors: z
        .array(
          z.object({
            type: z.enum(["alcohol", "sleep", "training", "stress", "ill", "care"]),
            context: z.string().optional(),
          })
        )
        .describe("Array of stressors with optional context strings"),
    },
    async ({ stressors }) => {
      // For now, we store the stressor data but do NOT call AI analysis here.
      // Real analysis requires face/HRV data — this is a simplified log-only tool.
      // In production, you'd trigger the /api/analyze flow or replicate its logic.
      const mockScore = stressors.reduce((acc, s) => {
        const points = { alcohol: 30, sleep: 24, training: 15, stress: 12, ill: 35, care: -10 }[s.type] ?? 0;
        return acc + points;
      }, 0);
      const clampedScore = Math.max(0, Math.min(100, mockScore));

      const session = await createDebtSession({
        userId,
        stressors,
        debtScore: clampedScore,
        verdict: clampedScore >= 61 ? "Your body is working overtime." : clampedScore >= 41 ? "Elevated burden detected." : "Mild debt load.",
        recoveryTime: "later today",
        prescription: {
          rightNow: "Drink 500ml water immediately.",
          thisMorning: "No caffeine until 10am.",
          today: "Focus window 11am–1pm.",
          avoid: "Intense training today.",
        },
        stressorBreakdown: stressors.map((s) => ({
          stressor: s.type,
          points: { alcohol: 30, sleep: 24, training: 15, stress: 12, ill: 35, care: -10 }[s.type] ?? 0,
          insight: `${s.type} recorded with context: ${s.context ?? "none"}`,
          icon: "",
        })),
      });

      return {
        content: [
          {
            type: "text",
            text: `Stressors logged. New session ID: ${session.id}. Debt score: ${session.debtScore}. Verdict: ${session.verdict}`,
          },
        ],
      };
    }
  );
}
