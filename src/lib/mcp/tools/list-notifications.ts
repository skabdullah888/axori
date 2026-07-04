import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase-user";

export default defineTool({
  name: "list_notifications",
  title: "List notifications",
  description: "List the signed-in user's recent AxoraBD notifications.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("notifications")
      .select("*")
      .eq("user_id", ctx.getUserId()!)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { notifications: data ?? [] } };
  },
});
