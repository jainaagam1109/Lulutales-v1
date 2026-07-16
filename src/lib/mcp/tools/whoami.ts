import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "whoami",
  title: "Who am I",
  description: "Return the signed-in LuluTales user's id and email from the OAuth token.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: (_input: Record<string, never>, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const info = { user_id: ctx.getUserId(), email: ctx.getUserEmail() ?? null };
    return {
      content: [{ type: "text", text: JSON.stringify(info) }],
      structuredContent: info,
    };
  },
});
