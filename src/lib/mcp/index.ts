import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import whoamiTool from "./tools/whoami";

// Auth project ref (separate from the Lovable Cloud-linked project).
// Hardcoded to match src/integrations/supabase/client.ts.
const AUTH_PROJECT_REF = "lidbfkytoajumnhwlcry";

export default defineMcp({
  name: "lulutales-mcp",
  title: "LuluTales MCP",
  version: "0.1.0",
  instructions:
    "Tools for LuluTales. Use `echo` to verify connectivity and `whoami` to see who is signed in.",
  auth: auth.oauth.issuer({
    issuer: `https://${AUTH_PROJECT_REF}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [echoTool, whoamiTool],
});
