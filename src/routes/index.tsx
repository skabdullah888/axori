import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const SITE_URL = "https://axorabd.site";
const DESC =
  "AxoraBD (Axora BD) is Bangladesh's trusted online earning & micro-task platform. Complete simple tasks, submit proofs, earn money and withdraw easily via bKash, Nagad, Rocket.";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "AxoraBD",
      alternateName: ["Axora BD", "Axora", "AxoraBD.site"],
      url: SITE_URL,
      logo: `${SITE_URL}/favicon.png`,
      description: DESC,
    },
    {
      "@type": "WebSite",
      name: "AxoraBD",
      alternateName: "Axora BD",
      url: SITE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AxoraBD - Axora BD | Earn Money Online in Bangladesh" },
      { name: "description", content: DESC },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(jsonLd),
      },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      throw redirect({ to: "/app/dashboard" });
    }
  },
  component: LandingPage,
});

function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="text-xl font-bold">AxoraBD</div>
        <nav className="flex gap-3">
          <Link to="/auth/login" className="px-4 py-2 text-sm">Login</Link>
          <Link to="/auth/register" className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground">
            Sign Up
          </Link>
        </nav>
      </header>

      <section className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          AxoraBD — Axora BD
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Bangladesh's trusted micro-task & online earning platform
        </p>
        <p className="mt-6 max-w-2xl mx-auto text-base text-muted-foreground">
          {DESC}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/auth/register" className="px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium">
            Start Earning
          </Link>
          <Link to="/auth/login" className="px-6 py-3 rounded-md border font-medium">
            Login
          </Link>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 grid md:grid-cols-3 gap-6">
        <article className="p-6 rounded-lg border">
          <h2 className="text-xl font-semibold">Why AxoraBD?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            AxoraBD (also known as Axora BD) connects task publishers and earners in
            one modern platform built for Bangladesh.
          </p>
        </article>
        <article className="p-6 rounded-lg border">
          <h2 className="text-xl font-semibold">Easy Withdrawals</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Withdraw your AxoraBD earnings through bKash, Nagad and Rocket quickly
            and securely.
          </p>
        </article>
        <article className="p-6 rounded-lg border">
          <h2 className="text-xl font-semibold">Real Tasks, Real Income</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Complete simple online tasks on Axora BD, submit proofs and earn verified
            rewards every day.
          </p>
        </article>
      </section>

      <section className="container mx-auto px-4 py-12 max-w-3xl">
        <h2 className="text-2xl font-bold">About Axora BD</h2>
        <p className="mt-3 text-muted-foreground">
          AxoraBD is the official Axora platform for Bangladesh. Whether you searched
          for "axora bd", "axorabd" or just "axora", you've reached the right place.
          Join thousands of users already earning online through AxoraBD.
        </p>
      </section>

      <footer className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} AxoraBD · axorabd.site
      </footer>
    </main>
  );
}
