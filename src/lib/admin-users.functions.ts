import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // Verify caller is admin
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roles) throw new Error("Forbidden");

    // Delete dependent rows (no FK cascades defined)
    await supabaseAdmin.from("notifications").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("payments").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("appeals").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("referral_earnings").delete().or(`referrer_id.eq.${data.userId},referred_id.eq.${data.userId}`);
    await supabaseAdmin.from("task_submissions").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("tasks").delete().eq("publisher_id", data.userId);
    await supabaseAdmin.from("security_logs").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").update({ referred_by: null }).eq("referred_by", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("user_id", data.userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
