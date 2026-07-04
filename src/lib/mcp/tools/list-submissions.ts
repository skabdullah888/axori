import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase-user";

export default defineTool({
  name: "list_my_submissions",
  title: "List my submissions",
  description: "List the signed-in user's recent task submissions with status (pending, approved, rejected).",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(20),
    status: z.enum(["pending", "approved", "rejected"]).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("task_submissions")
      .select("id,task_id,status,note,created_at,updated_at,tasks(title,reward)")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { submissions: data ?? [] } };
  },
});
