import { createFileRoute, useSearch } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/auth/register")({
  head: () => ({
    meta: [
      { title: "Sign Up — AxoraBD" },
      { name: "description", content: "Create your free AxoraBD account and grow your YouTube, Facebook, TikTok & Instagram with real likes, comments, follows, subscribers and views from the community." },
      { property: "og:title", content: "Sign Up — AxoraBD" },
      { property: "og:description", content: "Join AxoraBD free — exchange real social engagement and grow your channel." },
      { property: "og:url", content: "https://axorabd.site/auth/register" },
    ],
    links: [{ rel: "canonical", href: "https://axorabd.site/auth/register" }],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ ref: (s.ref as string) || "" }),
  component: RegisterPage,
});

function RegisterPage() {
  const { ref } = useSearch({ from: "/auth/register" });
  return <AuthShell initialMode="register" referral={ref} />;
}
