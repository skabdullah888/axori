import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

// Credentials are read from server-side secrets — never hardcoded.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: { username: string; password: string }) =>
    z.object({ username: z.string(), password: z.string() }).parse(d),
  )
  .handler(async ({ data }) => {
    if (!ADMIN_USERNAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
      return { ok: false as const, email: null, error: "Admin credentials not configured" };
    }
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
