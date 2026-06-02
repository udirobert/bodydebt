import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getLatestDebtSession } from "@/lib/db/queries";

export function registerGetLatestDebtTool(server: McpServer, userId: string) {
  server.tool(
    "get_latest_debt",
    "Get the user's most recent body debt score and recovery prescription.",
    {},
    async () => {
      const session = await getLatestDebtSession(userId);
      if (!session) {
        return {
          content: [
            { type: "text", text: "No debt sessions found for this user." },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                debtScore: session.debtScore,
                verdict: session.verdict,
                recoveryTime: session.recoveryTime,
                prescription: session.prescription,
                stressorBreakdown: session.stressorBreakdown,
                createdAt: session.createdAt,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
