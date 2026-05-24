import { useEffect, useState } from "react";
import { Megaphone, Info, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Linkified } from "@/lib/linkify";

type Notice = {
  id: string;
  title: string;
  body: string;
  type: string;
  active: boolean;
  created_at: string;
};

const typeStyles: Record<string, { icon: any; cls: string }> = {
  info: { icon: Info, cls: "border-primary/30 bg-primary/5 text-primary" },
  success: { icon: CheckCircle2, cls: "border-success/30 bg-success/5 text-success" },
  warning: { icon: AlertTriangle, cls: "border-warning/30 bg-warning/5 text-warning" },
  error: { icon: AlertCircle, cls: "border-destructive/30 bg-destructive/5 text-destructive" },
};

export function NoticeBoard() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("notice_board").select("*")
      .eq("active", true).order("created_at", { ascending: false }).limit(10);
    setNotices((data as Notice[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("notice-board-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "notice_board" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (loading || notices.length === 0) return null;

  return (
    <Card className="mb-6 border-border/60 bg-card/60">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Megaphone className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider">Notice Board</h3>
        </div>
        <div className="space-y-2">
          {notices.map((n) => {
            const s = typeStyles[n.type] ?? typeStyles.info;
            const Icon = s.icon;
            return (
              <div key={n.id} className={cn("flex items-start gap-3 rounded-lg border p-3", s.cls)}>
                <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{n.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">
                    {linkify(n.body)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
