import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGetDebtHistoryTool } from "./tools/get-debt-history";
import { registerGetLatestDebtTool } from "./tools/get-latest-debt";
import { registerLogStressorsTool } from "./tools/log-stressors";
import { registerGetPrescriptionTool } from "./tools/get-prescription";
import { registerGetRecoveryStatusTool } from "./tools/get-recovery-status";

export function buildMcpServer(userId: string): McpServer {
  const server = new McpServer({
    name: "orbura-mcp",
    version: "1.0.0",
  });

  registerGetDebtHistoryTool(server, userId);
  registerGetLatestDebtTool(server, userId);
  registerLogStressorsTool(server, userId);
  registerGetPrescriptionTool(server, userId);
  registerGetRecoveryStatusTool(server, userId);

  return server;
}
