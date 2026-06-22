import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Coins, Clock, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reward: number;
}

export function SubmissionSuccessDialog({ open, onOpenChange, reward }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm overflow-hidden p-0 border-success/30">
        {/* Confetti-ish background */}
        <div className="relative bg-gradient-to-br from-success/20 via-primary/10 to-transparent p-6 pb-4 text-center">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className="absolute block rounded-full opacity-70 animate-confetti"
                style={{
                  left: `${(i * 7) % 100}%`,
                  top: `-10%`,
                  width: `${6 + (i % 3) * 3}px`,
                  height: `${6 + (i % 3) * 3}px`,
                  backgroundColor: ["#f59e0b", "#ef4444", "#10b981", "#3b82f6", "#a855f7"][i % 5],
                  animationDelay: `${i * 0.12}s`,
                  animationDuration: `${1.6 + (i % 4) * 0.3}s`,
                }}
              />
            ))}
          </div>
          <div className="relative">
            <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-success to-success/70 flex items-center justify-center shadow-lg shadow-success/40 animate-in zoom-in-50 duration-500">
              <CheckCircle2 className="h-9 w-9 text-white" />
            </div>
            <h2 className="mt-4 text-xl font-bold tracking-tight">Submission sent! 🎉</h2>
            <p className="text-sm text-muted-foreground mt-1">Your proof is now with the publisher.</p>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-3">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
              <Coins className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Reward on approval</div>
              <div className="text-lg font-bold text-primary">৳{Number(reward).toFixed(2)}</div>
            </div>
            <Sparkles className="h-5 w-5 text-primary/60" />
          </div>

          <div className="rounded-lg bg-muted/50 border border-border p-3 flex gap-2 text-sm">
            <Clock className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-muted-foreground leading-snug">
              <span className="text-foreground font-medium">Publisher accept korle</span> automatic apnar balance e <span className="text-foreground font-medium">৳{Number(reward).toFixed(2)} add</span> hoye jabe.
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Stay here
            </Button>
            <Link to="/app/submissions" className="flex-1">
              <Button className="w-full bg-gradient-to-r from-primary to-primary/80">View submissions</Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
