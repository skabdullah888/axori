import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Wallet, Users, Sparkles, ShieldCheck, Smartphone, ArrowRight, Star, Quote } from "lucide-react";
import heroImg from "@/assets/hero-earning.jpg";
import withdrawImg from "@/assets/feature-withdraw.jpg";
import tasksImg from "@/assets/feature-tasks.jpg";
import trustImg from "@/assets/feature-trust.jpg";
import { getSiteTheme, type SiteTheme } from "@/lib/site-themes";
import { SiteThemeRoot } from "@/components/site-theme-root";
import { useSiteLogo } from "@/hooks/use-site-logo";
import { Reveal } from "@/components/reveal";
import { AnimatedCounter } from "@/components/animated-counter";
import { TestimonialsCarousel } from "@/components/testimonials-carousel";

const SITE_URL = "https://axorabd.site";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "AxoraBD",
      alternateName: ["Axora BD", "Axora", "AxoraBD.site"],
      url: SITE_URL,
      logo: `${SITE_URL}/favicon.png`,
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
  loader: async () => {
    const { data } = await supabase.rpc("get_site_theme");
    return { theme: getSiteTheme(typeof data === "string" ? data : "default") };
  },
  head: ({ loaderData }) => {
    const t: SiteTheme = loaderData?.theme ?? getSiteTheme("default");
    return {
      meta: [
        { title: t.meta.title },
        { name: "description", content: t.meta.description },
        { property: "og:title", content: t.meta.title },
        { property: "og:description", content: t.meta.description },
      ],
      links: [{ rel: "canonical", href: "/" }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(jsonLd) },
      ],
    };
  },
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      throw redirect({ to: "/app/dashboard" });
    }
  },
  component: LandingPage,
});

const FEATURE_IMGS = [tasksImg, withdrawImg, trustImg];
const FEATURE_ICONS = [CheckCircle2, Wallet, ShieldCheck];

function LandingPage() {
  const { theme } = Route.useLoaderData() as { theme: SiteTheme };
  const siteLogo = useSiteLogo();
  const h = theme.hero;

  return (
    <SiteThemeRoot theme={theme}>
      <main className="min-h-screen bg-background text-foreground overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {siteLogo ? (
                <img src={siteLogo} alt="AxoraBD" className="h-9 w-9 rounded-lg object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold">A</div>
              )}
              <span className="text-lg font-bold">AxoraBD</span>
            </div>
            <nav className="flex items-center gap-2">
              <Link to="/about" className="px-3 py-2 text-sm font-medium hover:text-primary">About</Link>
              <Link to="/auth/login" className="px-3 py-2 text-sm font-medium hover:text-primary">Login</Link>
              <Link to="/auth/register" className="px-4 py-2 text-sm font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90 transition">
                Sign Up
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero — animated gradient mesh */}
        <section className="relative">
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute top-0 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/25 blur-3xl animated-blob-a" />
            <div className="absolute top-40 -right-32 w-[30rem] h-[30rem] rounded-full bg-accent/50 blur-3xl animated-blob-b" />
            <div className="absolute bottom-0 left-1/3 w-96 h-96 rounded-full bg-primary/10 blur-3xl animated-blob-a" />
          </div>
          <div className="container mx-auto px-4 py-12 md:py-20 grid md:grid-cols-2 gap-10 items-center">
            <Reveal direction="up">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold animate-pulse">
                <Sparkles className="w-3.5 h-3.5" /> {h.badge}
              </span>
              <h1 className="mt-4 text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
                {h.titlePrefix}{" "}
                <span className="bg-gradient-to-r from-primary via-primary/70 to-primary bg-clip-text text-transparent animated-gradient-text">
                  {h.titleHighlight}
                </span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground max-w-xl">{h.subtitle}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/auth/register" className="group inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all">
                  {h.ctaPrimary} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/auth/login" className="px-6 py-3 rounded-md border font-semibold hover:bg-accent transition">
                  {h.ctaSecondary}
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-primary text-primary" />)}
                  <span className="ml-1 font-semibold text-foreground">4.9/5</span>
                </div>
                <div className="flex items-center gap-2"><Users className="w-4 h-4" /> 10,000+ users</div>
              </div>
            </Reveal>
            <Reveal direction="left" delay={120}>
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-primary/30 to-accent rounded-3xl blur-2xl animate-pulse" />
                <img
                  src={heroImg}
                  alt={`AxoraBD — ${theme.tagline}`}
                  width={1536}
                  height={1024}
                  className="relative rounded-2xl shadow-2xl border w-full h-auto hover:scale-[1.02] transition-transform duration-500"
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Live Stats with animated counters */}
        <section className="container mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {theme.stats.map((s, idx) => {
              const match = String(s.v).match(/^([^\d]*)([\d,]+(?:\.\d+)?)(.*)$/);
              const prefix = match?.[1] ?? "";
              const num = match ? Number(match[2].replace(/,/g, "")) : NaN;
              const suffix = match?.[3] ?? "";
              return (
                <Reveal key={s.l} delay={idx * 80}>
                  <div className="p-5 rounded-xl bg-card border text-center hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all">
                    <div className="text-2xl md:text-3xl font-extrabold text-primary tabular-nums">
                      {Number.isFinite(num) ? (
                        <>
                          {prefix}
                          <AnimatedCounter value={num} duration={1400} />
                          {suffix}
                        </>
                      ) : (
                        s.v
                      )}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground mt-1">{s.l}</div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* Testimonials */}
        <section className="container mx-auto px-4 py-16">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold mb-3">
                <Quote className="w-3.5 h-3.5" /> Real reviews
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                Loved by <span className="text-primary">10,000+</span> users
              </h2>
              <p className="mt-3 text-muted-foreground">Genuine stories from people earning on AxoraBD every day.</p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <TestimonialsCarousel />
          </Reveal>
        </section>

        

        {/* Features */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold">Why choose <span className="text-primary">AxoraBD</span>?</h2>
            <p className="mt-3 text-muted-foreground">{theme.tagline}</p>
          </div>

          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {theme.features.map((f, i) => {
              const Icon = FEATURE_ICONS[i] ?? CheckCircle2;
              return (
                <Reveal key={f.title} delay={i * 120}>
                  <article className="group h-full rounded-2xl border bg-card overflow-hidden hover:shadow-2xl hover:shadow-primary/15 hover:-translate-y-1.5 hover:border-primary/30 transition-all duration-300">
                    <div className="aspect-[4/3] overflow-hidden bg-accent/30">
                      <img src={FEATURE_IMGS[i] ?? tasksImg} alt={f.title} width={800} height={600} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="p-6">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary grid place-items-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-bold">{f.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* How it works */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold">How AxoraBD works</h2>
            <p className="mt-3 text-muted-foreground">Get started in 3 simple steps.</p>
          </div>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {theme.steps.map((s) => (
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
            <h2 className="text-3xl md:text-5xl font-extrabold">{theme.cta.title}</h2>
            <p className="mt-3 text-lg opacity-90 max-w-xl mx-auto">{theme.cta.subtitle}</p>
            <Link to="/auth/register" className="inline-flex items-center gap-2 mt-6 px-8 py-3 rounded-md bg-background text-foreground font-bold hover:opacity-90 transition">
              {theme.cta.button} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* About */}
        <section className="container mx-auto px-4 py-12 max-w-3xl">
          <h2 className="text-2xl font-bold">{theme.about.title}</h2>
          <p className="mt-3 text-muted-foreground">{theme.about.body}</p>
        </section>

        <footer className="border-t mt-8">
          <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold text-xs">A</div>
              <span>© {new Date().getFullYear()} AxoraBD · axorabd.site</span>
            </div>
            <div className="flex gap-4">
              <Link to="/about">About</Link>
              <Link to="/auth/login">Login</Link>
              <Link to="/auth/register">Sign Up</Link>
            </div>
          </div>
        </footer>
      </main>
    </SiteThemeRoot>
  );
}
