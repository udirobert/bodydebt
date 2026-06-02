import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getDebtSessionsByUser } from "@/lib/db/queries";

export function registerGetDebtHistoryTool(
  server: McpServer,
  userId: string
) {
  server.tool(
    "get_debt_history",
    "Get the user's past body debt assessment sessions with scores, verdicts, and timestamps.",
    {
      limit: z.number().int().min(1).max(20).default(5).describe("Number of recent sessions to return"),
    },
    async ({ limit }) => {
      const sessions = await getDebtSessionsByUser(userId, limit);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              sessions.map((s) => ({
                id: Number(s.id),
                debtScore: s.debtScore,
                verdict: s.verdict,
                recoveryTime: s.recoveryTime,
                stressorCount: (s.stressors as unknown[])?.length ?? 0,
                createdAt: s.createdAt,
              })),
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
