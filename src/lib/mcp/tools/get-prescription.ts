import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getLatestDebtSession } from "@/lib/db/queries";

export function registerGetPrescriptionTool(
  server: McpServer,
  userId: string
) {
  server.tool(
    "get_prescription",
    "Get the user's current body recovery prescription with specific directives.",
    {},
    async () => {
      const session = await getLatestDebtSession(userId);
      if (!session || !session.prescription) {
        return {
          content: [
            { type: "text", text: "No prescription available. User has not completed an assessment." },
          ],
        };
      }

      const p = session.prescription as {
        rightNow: string;
        thisMorning: string;
        today: string;
        avoid: string;
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                rightNow: p.rightNow,
                thisMorning: p.thisMorning,
                today: p.today,
                avoid: p.avoid,
                debtScore: session.debtScore,
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
