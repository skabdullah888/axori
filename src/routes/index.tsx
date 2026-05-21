import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Wallet, Users, Sparkles, ShieldCheck, Smartphone, ArrowRight, Star } from "lucide-react";
import heroImg from "@/assets/hero-earning.jpg";
import withdrawImg from "@/assets/feature-withdraw.jpg";
import tasksImg from "@/assets/feature-tasks.jpg";
import trustImg from "@/assets/feature-trust.jpg";

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
    <main className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold">A</div>
            <span className="text-lg font-bold">AxoraBD</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link to="/auth/login" className="px-3 py-2 text-sm font-medium hover:text-primary">Login</Link>
            <Link to="/auth/register" className="px-4 py-2 text-sm font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90 transition">
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute top-40 -right-32 w-96 h-96 rounded-full bg-accent/40 blur-3xl" />
        </div>
        <div className="container mx-auto px-4 py-12 md:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> Bangladesh's #1 earning platform
            </span>
            <h1 className="mt-4 text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Earn Money Online with{" "}
              <span className="text-primary">AxoraBD</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">
              AxoraBD (Axora BD) — complete simple micro-tasks, submit proofs, and withdraw instantly via bKash, Nagad & Rocket. Trusted by thousands of Bangladeshi earners.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/auth/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/30 hover:opacity-90 transition">
                Start Earning <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/auth/login" className="px-6 py-3 rounded-md border font-semibold hover:bg-accent transition">
                Login
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-primary text-primary" />)}
                <span className="ml-1 font-semibold text-foreground">4.9/5</span>
              </div>
              <div className="flex items-center gap-2"><Users className="w-4 h-4" /> 10,000+ users</div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-accent rounded-3xl blur-2xl" />
            <img
              src={heroImg}
              alt="AxoraBD - earn money online in Bangladesh"
              width={1536}
              height={1024}
              className="relative rounded-2xl shadow-2xl border w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { v: "10K+", l: "Active Users" },
            { v: "৳50L+", l: "Paid Out" },
            { v: "50K+", l: "Tasks Done" },
            { v: "24/7", l: "Support" },
          ].map((s) => (
            <div key={s.l} className="p-5 rounded-xl bg-card border text-center">
              <div className="text-2xl md:text-3xl font-extrabold text-primary">{s.v}</div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold">Why choose <span className="text-primary">AxoraBD</span>?</h2>
          <p className="mt-3 text-muted-foreground">Everything you need to start earning online in Bangladesh — built for trust, speed, and simplicity.</p>
        </div>

        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {[
            { img: tasksImg, icon: CheckCircle2, title: "Real Tasks", desc: "Complete simple online tasks daily and earn verified rewards instantly." },
            { img: withdrawImg, icon: Wallet, title: "Fast Withdrawals", desc: "Cash out through bKash, Nagad and Rocket — fast, secure and reliable." },
            { img: trustImg, icon: ShieldCheck, title: "Trusted Platform", desc: "Thousands of Bangladeshis already earn with AxoraBD every single day." },
          ].map((f) => (
            <article key={f.title} className="group rounded-2xl border bg-card overflow-hidden hover:shadow-xl hover:-translate-y-1 transition">
              <div className="aspect-[4/3] overflow-hidden bg-accent/30">
                <img src={f.img} alt={f.title} width={800} height={600} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition" />
              </div>
              <div className="p-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary grid place-items-center mb-3">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold">How AxoraBD works</h2>
          <p className="mt-3 text-muted-foreground">Get started in 3 simple steps.</p>
        </div>
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {[
            { n: "01", t: "Sign up free", d: "Create your AxoraBD account in seconds." },
            { n: "02", t: "Complete tasks", d: "Pick from available tasks and submit proofs." },
            { n: "03", t: "Get paid", d: "Withdraw earnings via bKash, Nagad or Rocket." },
          ].map((s) => (
            <div key={s.n} className="relative p-6 rounded-2xl border bg-card">
              <div className="text-5xl font-extrabold text-primary/20 absolute top-3 right-4">{s.n}</div>
              <h3 className="text-xl font-bold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="relative rounded-3xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-10 md:p-16 text-center overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 -left-12 w-56 h-56 rounded-full bg-white/10" />
          <Smartphone className="w-12 h-12 mx-auto mb-4 opacity-90" />
          <h2 className="text-3xl md:text-5xl font-extrabold">Ready to start earning?</h2>
          <p className="mt-3 text-lg opacity-90 max-w-xl mx-auto">Join AxoraBD today and turn your free time into real taka income.</p>
          <Link to="/auth/register" className="inline-flex items-center gap-2 mt-6 px-8 py-3 rounded-md bg-background text-foreground font-bold hover:opacity-90 transition">
            Create Free Account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* About */}
      <section className="container mx-auto px-4 py-12 max-w-3xl">
        <h2 className="text-2xl font-bold">About Axora BD</h2>
        <p className="mt-3 text-muted-foreground">
          AxoraBD is the official Axora platform for Bangladesh. Whether you searched
          for "axora bd", "axorabd" or just "axora", you've reached the right place.
          Join thousands of users already earning online through AxoraBD.
        </p>
      </section>

      <footer className="border-t mt-8">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold text-xs">A</div>
            <span>© {new Date().getFullYear()} AxoraBD · axorabd.site</span>
          </div>
          <div className="flex gap-4">
            <Link to="/auth/login">Login</Link>
            <Link to="/auth/register">Sign Up</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
