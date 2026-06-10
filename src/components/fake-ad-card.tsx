import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ExternalLink, Coins, Star } from "lucide-react";

// House / fake sponsored ads — used to fill task grids and as a fallback
// when a placement is enabled but no provider snippet was pasted yet, so the
// UI never shows an empty/awkward ad slot.

type FakeAd = {
  badge: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  gradient: string;
  emoji: string;
};

const FAKE_ADS: FakeAd[] = [
  {
    badge: "Sponsored",
    title: "Boost Your Earnings with Premium Tasks",
    description: "Unlock high-paying tasks by activating your account today.",
    cta: "Activate Now",
    href: "/app/profile",
    gradient: "from-amber-500/30 via-orange-500/20 to-rose-500/30",
    emoji: "💰",
  },
  {
    badge: "Promoted",
    title: "Invite Friends — Earn ৳20 per Referral",
    description: "Share your referral link and earn passive income.",
    cta: "Get Your Link",
    href: "/app/referrals",
    gradient: "from-emerald-500/30 via-teal-500/20 to-cyan-500/30",
    emoji: "🎁",
  },
  {
    badge: "Featured",
    title: "Publish Your Own Task",
    description: "Get real users to complete your micro-tasks fast.",
    cta: "Publish Task",
    href: "/app/publish",
    gradient: "from-violet-500/30 via-purple-500/20 to-fuchsia-500/30",
    emoji: "📢",
  },
  {
    badge: "Hot",
    title: "Withdraw Faster — Verified Methods",
    description: "bKash, Nagad & Rocket. Instant approval for active users.",
    cta: "Withdraw",
    href: "/app/withdraw",
    gradient: "from-sky-500/30 via-blue-500/20 to-indigo-500/30",
    emoji: "⚡",
  },
];

/**
 * Sponsored-looking card that blends into the task grid. Always visible (does
 * not depend on ad-provider config) so the layout stays lively even before
 * the admin pastes any ad code.
 */
export function FakeAdCard({ index = 0 }: { index?: number }) {
  const ad = useMemo(() => FAKE_ADS[index % FAKE_ADS.length], [index]);
  return (
    <Card className="group overflow-hidden border-primary/30 hover:border-primary/60 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10 relative">
      <div className="absolute top-2 right-2 z-10">
        <Badge variant="outline" className="bg-background/80 backdrop-blur text-[9px] uppercase tracking-wider border-primary/40 text-primary">
          <Sparkles className="h-2.5 w-2.5 mr-0.5" /> Ad
        </Badge>
      </div>
      <div className={`aspect-video bg-gradient-to-br ${ad.gradient} flex items-center justify-center text-5xl`}>
        <span className="drop-shadow-lg">{ad.emoji}</span>
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{ad.badge}</Badge>
          <div className="flex items-center gap-1 text-primary font-bold text-xs">
            <Star className="h-3 w-3 fill-current" /> Featured
          </div>
        </div>
        <h3 className="font-semibold line-clamp-1 mb-1">{ad.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{ad.description}</p>
        <Button asChild size="sm" className="w-full bg-gradient-to-r from-primary to-primary/80">
          <a href={ad.href}>
            <Coins className="h-3.5 w-3.5" /> {ad.cta} <ExternalLink className="h-3 w-3 ml-auto" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Wide sponsored banner — used as a fallback inside AdSlot when no provider
 * code is configured, so enabled placements still display something.
 */
export function FakeAdBanner({ index = 0 }: { index?: number }) {
  const ad = useMemo(() => FAKE_ADS[index % FAKE_ADS.length], [index]);
  return (
    <a
      href={ad.href}
      className={`block w-full rounded-xl border border-primary/30 bg-gradient-to-r ${ad.gradient} p-4 hover:border-primary/60 transition-all hover:shadow-lg hover:shadow-primary/10`}
    >
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-lg bg-background/40 backdrop-blur flex items-center justify-center text-2xl shrink-0">
          {ad.emoji}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 mb-0.5">
            <Badge variant="outline" className="bg-background/60 text-[9px] uppercase tracking-wider">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" /> Sponsored
            </Badge>
          </div>
          <p className="font-semibold text-sm truncate">{ad.title}</p>
          <p className="text-xs text-muted-foreground truncate">{ad.description}</p>
        </div>
        <Button size="sm" variant="secondary" className="shrink-0">
          {ad.cta}
        </Button>
      </div>
    </a>
  );
}
