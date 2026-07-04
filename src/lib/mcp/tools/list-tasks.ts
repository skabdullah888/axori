import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase-user";

export default defineTool({
  name: "list_available_tasks",
  title: "List available tasks",
  description: "List currently available AxoraBD micro-tasks the user can complete, with reward, category and remaining slots.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(20).describe("Max number of tasks to return."),
    category: z.string().optional().describe("Optional category filter."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, category }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("tasks")
      .select("id,title,description,category,reward,total_slots,completed_slots,proof_type,deadline,status")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (category) q = q.eq("category", category);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { tasks: data ?? [] } };
  },
});
