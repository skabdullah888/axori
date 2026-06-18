import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Wallet, Users, CheckCircle2, Sparkles, Mail, Globe, Award, Target, Heart, ArrowRight, Facebook, Youtube, Instagram, Twitter, Send, MessageCircle, Music2, Linkedin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SITE_URL = "https://axorabd.site";

const SOCIAL_DEFS = [
  { key: "social_facebook", label: "Facebook", Icon: Facebook, color: "hover:text-[#1877F2]" },
  { key: "social_youtube", label: "YouTube", Icon: Youtube, color: "hover:text-[#FF0000]" },
  { key: "social_instagram", label: "Instagram", Icon: Instagram, color: "hover:text-[#E1306C]" },
  { key: "social_twitter", label: "Twitter / X", Icon: Twitter, color: "hover:text-foreground" },
  { key: "social_telegram", label: "Telegram", Icon: Send, color: "hover:text-[#229ED9]" },
  { key: "social_whatsapp", label: "WhatsApp", Icon: MessageCircle, color: "hover:text-[#25D366]" },
  { key: "social_tiktok", label: "TikTok", Icon: Music2, color: "hover:text-foreground" },
  { key: "social_linkedin", label: "LinkedIn", Icon: Linkedin, color: "hover:text-[#0A66C2]" },
] as const;

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About AxoraBD — Bangladesh's Trusted Earning Platform" },
      { name: "description", content: "Learn about AxoraBD (Axora BD) — our mission, story, features, and how we help thousands earn online through micro-tasks in Bangladesh." },
      { property: "og:title", content: "About AxoraBD — Bangladesh's Trusted Earning Platform" },
      { property: "og:description", content: "Learn about AxoraBD — our mission, story, and how we help thousands earn online in Bangladesh." },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/about` }],
  }),
  component: AboutPage,
});

function AboutPage() {
  const [socials, setSocials] = useState<Record<string, string>>({});
  const [contactEmail, setContactEmail] = useState<string>("");

  useEffect(() => {
    supabase
      .from("settings")
      .select("social_facebook,social_youtube,social_instagram,social_twitter,social_telegram,social_whatsapp,social_tiktok,social_linkedin,contact_email")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const d = data as any;
        setSocials({
          social_facebook: d.social_facebook ?? "",
          social_youtube: d.social_youtube ?? "",
          social_instagram: d.social_instagram ?? "",
          social_twitter: d.social_twitter ?? "",
          social_telegram: d.social_telegram ?? "",
          social_whatsapp: d.social_whatsapp ?? "",
          social_tiktok: d.social_tiktok ?? "",
          social_linkedin: d.social_linkedin ?? "",
        });
        setContactEmail(d.contact_email ?? "");
      });
  }, []);

  const activeSocials = SOCIAL_DEFS.filter((s) => (socials[s.key] ?? "").trim().length > 0);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            {siteLogo ? (
              <img src={siteLogo} alt="AxoraBD" className="h-9 w-9 rounded-lg object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold">A</div>
            )}
            <span className="text-lg font-bold">AxoraBD</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/" className="px-3 py-2 text-sm font-medium hover:text-primary">Home</Link>
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
        <div className="container mx-auto px-4 py-16 md:py-24 text-center max-w-3xl">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> About Us
          </span>
          <h1 className="mt-4 text-4xl md:text-6xl font-extrabold tracking-tight">
            We are <span className="text-primary">AxoraBD</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Bangladesh's trusted micro-task & earning platform — empowering thousands to earn from home with simple online tasks.
          </p>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="container mx-auto px-4 py-12 grid md:grid-cols-2 gap-6">
        <article className="p-8 rounded-2xl border bg-card">
          <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary grid place-items-center mb-4">
            <Target className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold">Our Mission</h2>
          <p className="mt-3 text-muted-foreground">
            To create real online earning opportunities for every Bangladeshi — students, freelancers, and stay-at-home workers — through simple, transparent, and reliable micro-tasks.
          </p>
        </article>
        <article className="p-8 rounded-2xl border bg-card">
          <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary grid place-items-center mb-4">
            <Heart className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold">Our Vision</h2>
          <p className="mt-3 text-muted-foreground">
            To become Bangladesh's #1 trusted online income platform — where publishers find quality work done and workers earn fair, timely rewards.
          </p>
        </article>
      </section>

      {/* Story */}
      <section className="container mx-auto px-4 py-12 max-w-3xl">
        <h2 className="text-3xl font-bold">Our Story</h2>
        <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
          <p>
            AxoraBD was founded with one simple goal: to make online earning accessible for everyone in Bangladesh. We saw thousands of people looking for legitimate ways to earn from home but struggling with scams, late payments, and unreliable platforms.
          </p>
          <p>
            We built AxoraBD as a trusted bridge between publishers who need micro-tasks completed and workers who want to earn online. Every task is verified, every withdrawal is processed quickly, and every user is treated fairly.
          </p>
          <p>
            Today, AxoraBD serves over 10,000+ users across Bangladesh, with hundreds of tasks completed daily and instant withdrawals via bKash, Nagad, and Rocket.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold">What we offer</h2>
          <p className="mt-3 text-muted-foreground">Everything you need to earn or get work done online.</p>
        </div>
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {[
            { icon: CheckCircle2, title: "Verified Micro-Tasks", desc: "Browse hundreds of simple tasks like sign-ups, app installs, social follows, and reviews — all manually verified." },
            { icon: Wallet, title: "Fast Withdrawals", desc: "Withdraw earnings instantly via bKash, Nagad, or Rocket. Low minimums and zero hidden fees." },
            { icon: ShieldCheck, title: "Secure & Trusted", desc: "Bank-grade security, anti-fraud protection, and a dedicated support team to keep your account safe." },
            { icon: Users, title: "Publisher Tools", desc: "Publish your own tasks, set custom budgets, target real Bangladeshi users, and grow your business." },
            { icon: Award, title: "Referral Rewards", desc: "Invite friends and earn lifetime commission on their activity. Build your team and grow your income." },
            { icon: Globe, title: "24/7 Platform", desc: "Earn anytime, anywhere. Our platform runs round the clock with always-available tasks and instant support." },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <article key={f.title} className="p-6 rounded-2xl border bg-card hover:shadow-xl hover:-translate-y-1 transition">
                <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary grid place-items-center mb-3">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { v: "10K+", l: "Active Users" },
            { v: "500+", l: "Daily Tasks" },
            { v: "৳50L+", l: "Paid Out" },
            { v: "4.9/5", l: "User Rating" },
          ].map((s) => (
            <div key={s.l} className="p-5 rounded-xl bg-card border text-center">
              <div className="text-2xl md:text-3xl font-extrabold text-primary">{s.v}</div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold">Our core values</h2>
          <p className="mt-3 text-muted-foreground">The principles that guide everything we do.</p>
        </div>
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          {[
            { t: "Transparency", d: "Clear pricing, clear rules, clear payouts. No hidden fees, ever." },
            { t: "Reliability", d: "Payments processed on time, every time. Your trust is our priority." },
            { t: "Community", d: "We build for Bangladesh — with local payment methods, local support, and local language." },
            { t: "Innovation", d: "Always improving — new features, better tools, smoother experience." },
          ].map((v) => (
            <div key={v.t} className="p-6 rounded-xl border bg-card">
              <h3 className="font-bold text-lg">{v.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{v.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="p-8 rounded-2xl border bg-card">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" /> Get in touch
          </h2>
          <p className="mt-3 text-muted-foreground">
            Questions, feedback, or partnership inquiries? We'd love to hear from you.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><span className="font-semibold">Website:</span> <a href={SITE_URL} className="text-primary hover:underline">axorabd.site</a></li>
            {contactEmail && (
              <li><span className="font-semibold">Email:</span> <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">{contactEmail}</a></li>
            )}
            <li><span className="font-semibold">Support:</span> Available 24/7 through your dashboard</li>
          </ul>

          {activeSocials.length > 0 && (
            <div className="mt-6">
              <div className="text-sm font-semibold mb-3">Follow us</div>
              <div className="flex flex-wrap gap-3">
                {activeSocials.map(({ key, label, Icon, color }) => (
                  <a
                    key={key}
                    href={socials[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className={`w-11 h-11 grid place-items-center rounded-full border bg-background text-muted-foreground transition hover:shadow-md hover:-translate-y-0.5 ${color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="relative rounded-3xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-10 md:p-16 text-center overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 -left-12 w-56 h-56 rounded-full bg-white/10" />
          <h2 className="text-3xl md:text-5xl font-extrabold">Ready to start earning?</h2>
          <p className="mt-3 text-lg opacity-90 max-w-xl mx-auto">Join thousands of Bangladeshis already earning on AxoraBD.</p>
          <Link to="/auth/register" className="inline-flex items-center gap-2 mt-6 px-8 py-3 rounded-md bg-background text-foreground font-bold hover:opacity-90 transition">
            Create Free Account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t mt-8">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold text-xs">A</div>
            <span>© {new Date().getFullYear()} AxoraBD · axorabd.site</span>
          </div>
          <div className="flex gap-4">
            <Link to="/">Home</Link>
            <Link to="/auth/login">Login</Link>
            <Link to="/auth/register">Sign Up</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
