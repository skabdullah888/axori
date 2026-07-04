// Site theme presets. The site name (AxoraBD) and all features/workflow stay
// the same across every theme. Only visual tokens, hero/landing copy, and
// SEO meta change. Admin selects one preset from the settings panel.

export type SiteThemeId = "default" | "engagement" | "creator" | "rewards";

export type SiteTheme = {
  id: SiteThemeId;
  label: string;
  tagline: string;
  // CSS token overrides (oklch). Applied on top of styles.css defaults.
  tokens: {
    primary: string;
    primaryForeground: string;
    accent: string;
    accentForeground: string;
  };
  // Visual preview swatch (for the admin picker)
  swatch: [string, string, string];
  // Landing-page copy
  hero: {
    badge: string;
    titlePrefix: string;
    titleHighlight: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  stats: { v: string; l: string }[];
  features: { title: string; desc: string }[];
  steps: { n: string; t: string; d: string }[];
  cta: { title: string; subtitle: string; button: string };
  about: { title: string; body: string };
  // SEO
  meta: {
    title: string;
    description: string;
  };
  // Sidebar tagline (user app)
  appTagline: string;
};

const SITE_NAME = "AxoraBD";

export const SITE_THEMES: Record<SiteThemeId, SiteTheme> = {
  default: {
    id: "default",
    label: "AxoraBD Classic",
    tagline: "Bangladesh's trusted micro-task earning platform",
    tokens: {
      primary: "oklch(0.58 0.22 25)",
      primaryForeground: "oklch(0.99 0 0)",
      accent: "oklch(0.94 0.04 25)",
      accentForeground: "oklch(0.35 0.15 25)",
    },
    swatch: ["#d6432e", "#f4d9d3", "#1a0f0c"],
    hero: {
      badge: "Bangladesh's #1 earning platform",
      titlePrefix: "Earn Money Online with",
      titleHighlight: SITE_NAME,
      subtitle:
        "Complete simple micro-tasks, submit proofs, and withdraw instantly via bKash, Nagad & Rocket. Trusted by thousands of Bangladeshi earners.",
      ctaPrimary: "Start Earning",
      ctaSecondary: "Login",
    },
    stats: [
      { v: "10K+", l: "Active Users" },
      { v: "৳50L+", l: "Paid Out" },
      { v: "50K+", l: "Tasks Done" },
      { v: "24/7", l: "Support" },
    ],
    features: [
      { title: "Real Tasks", desc: "Complete simple online tasks daily and earn verified rewards instantly." },
      { title: "Fast Withdrawals", desc: "Cash out through bKash, Nagad and Rocket — fast, secure and reliable." },
      { title: "Trusted Platform", desc: `Thousands of Bangladeshis already earn with ${SITE_NAME} every single day.` },
    ],
    steps: [
      { n: "01", t: "Sign up free", d: `Create your ${SITE_NAME} account in seconds.` },
      { n: "02", t: "Complete tasks", d: "Pick from available tasks and submit proofs." },
      { n: "03", t: "Get paid", d: "Withdraw earnings via bKash, Nagad or Rocket." },
    ],
    cta: {
      title: "Ready to start earning?",
      subtitle: `Join ${SITE_NAME} today and turn your free time into real taka income.`,
      button: "Create Free Account",
    },
    about: {
      title: `About ${SITE_NAME}`,
      body: `${SITE_NAME} is Bangladesh's trusted micro-task & earning platform. Join thousands of users already earning online through ${SITE_NAME}.`,
    },
    meta: {
      title: `${SITE_NAME} | Real Social Engagement & Growth in Bangladesh`,
      description: `Grow on YouTube, Facebook, TikTok & Instagram with ${SITE_NAME}. Get real Likes, Comments, Follows, Subscribers & Views by engaging with the community — earn rewards & cash out via bKash, Nagad, Rocket.`,
    },
    appTagline: "Earn tasks",
  },

  engagement: {
    id: "engagement",
    label: "Social Engagement",
    tagline: "Grow together — help others, get help back",
    tokens: {
      primary: "oklch(0.58 0.18 250)",
      primaryForeground: "oklch(0.99 0 0)",
      accent: "oklch(0.94 0.04 250)",
      accentForeground: "oklch(0.35 0.15 250)",
    },
    swatch: ["#3b6ff0", "#dbe6fb", "#0a1226"],
    hero: {
      badge: "Community-powered engagement",
      titlePrefix: "Boost Each Other's Reach with",
      titleHighlight: SITE_NAME,
      subtitle:
        "Like, Comment, Follow, Subscribe & View — complete real engagement tasks to earn points, then spend them to grow your own social presence.",
      ctaPrimary: "Join the Community",
      ctaSecondary: "Login",
    },
    stats: [
      { v: "10K+", l: "Active Members" },
      { v: "1M+", l: "Engagements" },
      { v: "50K+", l: "Tasks Completed" },
      { v: "24/7", l: "Community" },
    ],
    features: [
      { title: "Real Engagement", desc: "Genuine likes, comments, follows, subscribes and views from real users." },
      { title: "Grow Your Channel", desc: "Spend earned points to publish your own task and pull in real engagement fast." },
      { title: "Community Driven", desc: "Members help each other reach the next milestone — no bots, no fakes." },
    ],
    steps: [
      { n: "01", t: "Sign up free", d: `Join the ${SITE_NAME} engagement network.` },
      { n: "02", t: "Help others", d: "Like, comment, follow, subscribe — earn points for every action." },
      { n: "03", t: "Get help back", d: "Publish your own task and let the community engage with you." },
    ],
    cta: {
      title: "Ready to grow together?",
      subtitle: `Join ${SITE_NAME} and turn community help into real reach for your channels.`,
      button: "Create Free Account",
    },
    about: {
      title: `About ${SITE_NAME}`,
      body: `${SITE_NAME} is a peer-to-peer engagement community where members help each other grow on social platforms. Complete real engagement tasks, earn points, and publish your own tasks to gain authentic likes, comments, follows, subscribes and views.`,
    },
    meta: {
      title: `${SITE_NAME} | Social Engagement & Growth Community`,
      description: `Grow your social presence with ${SITE_NAME}. Complete real Like, Comment, Follow, Subscribe & View tasks to earn points and use them to boost your own channel.`,
    },
    appTagline: "Engage & grow",
  },

  creator: {
    id: "creator",
    label: "Creator Studio",
    tagline: "Built for creators who want real growth",
    tokens: {
      primary: "oklch(0.55 0.22 295)",
      primaryForeground: "oklch(0.99 0 0)",
      accent: "oklch(0.94 0.04 295)",
      accentForeground: "oklch(0.35 0.15 295)",
    },
    swatch: ["#7b3ff2", "#e6d9fb", "#15082a"],
    hero: {
      badge: "Designed for creators",
      titlePrefix: "Grow Your Audience with",
      titleHighlight: SITE_NAME,
      subtitle:
        "Connect with a network of creators who exchange real engagement. Earn points by supporting others, then turn those points into views, followers and subscribers for your own work.",
      ctaPrimary: "Join as Creator",
      ctaSecondary: "Login",
    },
    stats: [
      { v: "10K+", l: "Creators" },
      { v: "1M+", l: "Views Delivered" },
      { v: "50K+", l: "Collabs" },
      { v: "24/7", l: "Studio" },
    ],
    features: [
      { title: "Audience Growth", desc: "Get real followers, subscribers and views from active members." },
      { title: "Creator Network", desc: "Collaborate with thousands of creators who help each other rise." },
      { title: "Full Control", desc: "Decide what you publish, how much you reward, and who engages." },
    ],
    steps: [
      { n: "01", t: "Join free", d: `Create your ${SITE_NAME} creator profile.` },
      { n: "02", t: "Support creators", d: "Engage with others' content to earn points." },
      { n: "03", t: "Publish & grow", d: "Spend points to bring real audience to your work." },
    ],
    cta: {
      title: "Ready to grow your channel?",
      subtitle: `Join ${SITE_NAME} and tap into a creator-first growth engine.`,
      button: "Create Free Account",
    },
    about: {
      title: `About ${SITE_NAME}`,
      body: `${SITE_NAME} is a creator-first growth platform. Exchange genuine engagement with other creators — every like, comment, follow, subscribe and view comes from a real person.`,
    },
    meta: {
      title: `${SITE_NAME} | Creator Growth Studio`,
      description: `${SITE_NAME} helps creators grow with real audience engagement. Earn growth points by supporting other creators, then use them to amplify your own channel.`,
    },
    appTagline: "Creator studio",
  },

  rewards: {
    id: "rewards",
    label: "Rewards Hub",
    tagline: "Every action earns — every point grows",
    tokens: {
      primary: "oklch(0.58 0.18 155)",
      primaryForeground: "oklch(0.99 0 0)",
      accent: "oklch(0.94 0.04 155)",
      accentForeground: "oklch(0.32 0.15 155)",
    },
    swatch: ["#1faa64", "#d4f1e0", "#06210f"],
    hero: {
      badge: "Earn points for every action",
      titlePrefix: "Earn Rewards with",
      titleHighlight: SITE_NAME,
      subtitle:
        "Complete simple online actions — like, comment, follow, subscribe, view — and earn points. Use your points to publish tasks and grow your own presence, or cash out.",
      ctaPrimary: "Start Earning",
      ctaSecondary: "Login",
    },
    stats: [
      { v: "10K+", l: "Earners" },
      { v: "1M+", l: "Points Paid" },
      { v: "50K+", l: "Tasks Done" },
      { v: "24/7", l: "Support" },
    ],
    features: [
      { title: "Earn Easily", desc: "Quick actions, instant point rewards — earn while you scroll." },
      { title: "Spend Smartly", desc: "Use points to launch your own engagement tasks." },
      { title: "Cash Out", desc: "Withdraw earnings via bKash, Nagad and Rocket whenever you want." },
    ],
    steps: [
      { n: "01", t: "Sign up free", d: `Join ${SITE_NAME} in seconds.` },
      { n: "02", t: "Earn points", d: "Complete engagement tasks to grow your balance." },
      { n: "03", t: "Spend or cash out", d: "Publish tasks or withdraw to your wallet." },
    ],
    cta: {
      title: "Ready to start earning?",
      subtitle: `Join ${SITE_NAME} and turn every action into a reward.`,
      button: "Create Free Account",
    },
    about: {
      title: `About ${SITE_NAME}`,
      body: `${SITE_NAME} is a rewards-driven engagement platform. Earn points for every like, comment, follow, subscribe and view — and spend or withdraw them on your own terms.`,
    },
    meta: {
      title: `${SITE_NAME} | Earn Rewards for Engagement`,
      description: `Earn real rewards on ${SITE_NAME} for likes, comments, follows, subscribes and views. Spend your points on growth tasks or cash out via bKash, Nagad, Rocket.`,
    },
    appTagline: "Earn rewards",
  },
};

export const SITE_THEME_LIST = Object.values(SITE_THEMES);

export function getSiteTheme(id: string | null | undefined): SiteTheme {
  if (id && id in SITE_THEMES) return SITE_THEMES[id as SiteThemeId];
  return SITE_THEMES.default;
}

// CSS that overrides theme tokens on a scoped wrapper element.
// Apply via <div className="site-theme-root"> + an injected <style>.
export function siteThemeStyleCSS(theme: SiteTheme): string {
  const t = theme.tokens;
  return `.site-theme-root{--primary:${t.primary};--primary-foreground:${t.primaryForeground};--accent:${t.accent};--accent-foreground:${t.accentForeground};--sidebar-primary:${t.primary};--sidebar-primary-foreground:${t.primaryForeground};--sidebar-accent:${t.accent};--sidebar-accent-foreground:${t.accentForeground};--ring:${t.primary};}`;
}
