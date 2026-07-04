import { createFileRoute } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/auth/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//") ? s.next : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Login — AxoraBD" },
      { name: "description", content: "Log in to AxoraBD and keep growing your social presence — complete engagement tasks (Like, Comment, Follow, Subscribe, View) and earn rewards." },
      { property: "og:title", content: "Login — AxoraBD" },
      { property: "og:description", content: "Sign in to AxoraBD — Bangladesh's social engagement & growth community." },
      { property: "og:url", content: "https://axorabd.site/auth/login" },
    ],
    links: [{ rel: "canonical", href: "https://axorabd.site/auth/login" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { next } = Route.useSearch();
  return <AuthShell initialMode="login" nextPath={next} />;
}
