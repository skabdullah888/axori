import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const ADMIN_USERNAME = "skabdullah999";
const ADMIN_EMAIL = "skabdullah999@admin.local";
const ADMIN_PASSWORD = "520aaAA@@";

export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: { username: string; password: string }) =>
    z.object({ username: z.string(), password: z.string() }).parse(d),
  )
  .handler(async ({ data }) => {
    if (data.username !== ADMIN_USERNAME || data.password !== ADMIN_PASSWORD) {
      return { ok: false as const, email: null };
    }

    // Check if user exists
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    const existing = list?.users?.find((u) => u.email === ADMIN_EMAIL);

    let userId = existing?.id;
    if (!existing) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
      });
      if (error || !created.user) {
        return { ok: false as const, email: null, error: error?.message };
      }
      userId = created.user.id;
    }

    if (userId) {
      // Ensure admin role
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    }

    return { ok: true as const, email: ADMIN_EMAIL };
  });
