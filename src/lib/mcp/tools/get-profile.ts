import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase-user";

export default defineTool({
  name: "get_profile",
  title: "Get my profile",
  description: "Return the signed-in user's AxoraBD profile: username, balance, trust score, publisher status and withdrawal destination.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("profiles")
      .select("username,full_name,email,balance,trust_score,status,is_publisher,checkin_streak,withdrawal_method,withdrawal_account,referral_code,created_at")
      .eq("user_id", ctx.getUserId()!)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Profile not found" }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { profile: data } };
  },
});
