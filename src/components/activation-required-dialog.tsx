import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ActivationRequiredDialog({
  open,
  onOpenChange,
  description = "You need to activate your account before you can submit tasks and start earning.",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  description?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto h-14 w-14 rounded-full bg-warning/15 flex items-center justify-center mb-2">
            <Lock className="h-6 w-6 text-warning" />
          </div>
          <DialogTitle className="text-center">Account activation required</DialogTitle>
          <DialogDescription className="text-center">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:flex-col gap-2">
          <Link to="/app/profile" onClick={() => onOpenChange(false)} className="w-full">
            <Button className="w-full bg-gradient-to-r from-primary to-primary/80">
              <Sparkles className="h-4 w-4" /> Activate my account
            </Button>
          </Link>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
