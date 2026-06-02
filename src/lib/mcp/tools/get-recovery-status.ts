import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getLatestDebtSession } from "@/lib/db/queries";

export function registerGetRecoveryStatusTool(
  server: McpServer,
  userId: string
) {
  server.tool(
    "get_recovery_status",
    "Get the user's current recovery status — whether they're in the danger zone, partially recovered, or fully cleared.",
    {},
    async () => {
      const session = await getLatestDebtSession(userId);
      if (!session) {
        return {
          content: [
            {
              type: "text",
              text: "No recent assessment. Body debt status unknown.",
            },
          ],
        };
      }

      const score = session.debtScore;
      const status =
        score >= 61
          ? "danger"
          : score >= 41
          ? "elevated"
          : score >= 21
          ? "mild"
          : "clear";

      const readout = {
        debtScore: score,
        status,
        verdict: session.verdict,
        recoveryTime: session.recoveryTime,
        lastAssessment: session.createdAt,
        interpretation:
          status === "danger"
            ? "Body in damage control. Significant physiological stress. Avoid training."
            : status === "elevated"
            ? "Your body is working overtime. Light activity only."
            : status === "mild"
            ? "Mild debt. Nothing you can't handle. Normal function reduced slightly."
            : "Body is clear. Full capacity restored.",
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(readout, null, 2),
          },
        ],
      };
    }
  );
}
