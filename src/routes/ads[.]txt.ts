import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/ads.txt")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const url = process.env.SUPABASE_URL!;
          const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
          const sb = createClient(url, key);
          const { data } = await sb
            .from("settings")
            .select("ads_txt")
            .limit(1)
            .maybeSingle();
          const body = ((data as any)?.ads_txt ?? "").toString();
          return new Response(body, {
            status: 200,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "public, max-age=300",
            },
          });
        } catch {
          return new Response("", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
        }
      },
    },
  },
});
