import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Send, Search, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/skabdullah_999_sg/admin/support")({
  head: () => ({ meta: [{ title: "Admin Support — AxoraBD" }] }),
  component: SupportPage,
});

type Msg = {
  id: string;
  user_id: string;
  sender: "user" | "admin";
  message: string;
  read_by_admin: boolean;
  read_by_user: boolean;
  created_at: string;
};

type Convo = {
  user_id: string;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  last_message: string;
  last_at: string;
  unread: number;
};

function SupportPage() {
  const { session } = useAuth();
  const adminId = session?.user?.id;
  const [convos, setConvos] = useState<Convo[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConvos = async () => {
    const { data } = await supabase
      .from("support_messages")
      .select("user_id, sender, message, created_at, read_by_admin")
      .order("created_at", { ascending: false })
      .limit(500);
    const rows = (data as Msg[] | null) ?? [];
    const byUser = new Map<string, Convo>();
    for (const r of rows) {
      const existing = byUser.get(r.user_id);
      if (!existing) {
        byUser.set(r.user_id, {
          user_id: r.user_id,
          username: null,
          email: null,
          avatar_url: null,
          last_message: r.message,
          last_at: r.created_at,
          unread: r.sender === "user" && !r.read_by_admin ? 1 : 0,
        });
      } else if (r.sender === "user" && !r.read_by_admin) {
        existing.unread += 1;
      }
    }
    const userIds = Array.from(byUser.keys());
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, username, email, avatar_url")
        .in("user_id", userIds);
      for (const p of (profs as any[] | null) ?? []) {
        const c = byUser.get(p.user_id);
        if (c) {
          c.username = p.username;
          c.email = p.email;
          c.avatar_url = p.avatar_url;
        }
      }
    }
    const list = Array.from(byUser.values()).sort(
      (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime(),
    );
    setConvos(list);
  };

  const loadMsgs = async (userId: string) => {
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(300);
    setMsgs((data as Msg[] | null) ?? []);
    // mark user-sent messages as read by admin
    const ids = ((data as Msg[] | null) ?? [])
      .filter((m) => m.sender === "user" && !m.read_by_admin)
      .map((m) => m.id);
    if (ids.length > 0) {
      await supabase.from("support_messages").update({ read_by_admin: true }).in("id", ids);
      loadConvos();
    }
  };

  useEffect(() => {
    loadConvos();
    const ch = supabase
      .channel(`admin-support-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, (payload) => {
        loadConvos();
        const row = payload.new as Msg | undefined;
        if (row && active && row.user_id === active) loadMsgs(active);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (active) loadMsgs(active);
  }, [active]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs.length, active]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return convos;
    return convos.filter(
      (c) =>
        (c.username ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        c.last_message.toLowerCase().includes(q),
    );
  }, [convos, search]);

  const send = async () => {
    if (!active || !adminId || !text.trim() || sending) return;
    setSending(true);
    const body = text.trim().slice(0, 2000);
    setText("");
    const { error } = await supabase.from("support_messages").insert({
      user_id: active,
      sender: "admin",
      sender_id: adminId,
      message: body,
    });
    if (error) {
      toast.error(error.message);
      setText(body);
    }
    setSending(false);
  };

  const activeConvo = convos.find((c) => c.user_id === active);

  return (
    <AdminShell title="Support">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-9rem)]">
        {/* Conversation list */}
        <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users…"
                className="w-full pl-8 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="p-6 text-center text-xs text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No conversations yet.
              </div>
            )}
            {filtered.map((c) => (
              <button
                key={c.user_id}
                onClick={() => setActive(c.user_id)}
                className={cn(
                  "w-full text-left px-3 py-3 border-b border-border/50 flex items-start gap-3 hover:bg-accent/50 transition",
                  active === c.user_id && "bg-accent",
                )}
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0 overflow-hidden">
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (c.username?.[0] ?? "U").toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium truncate">{c.username ?? "User"}</div>
                    <div className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(c.last_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{c.last_message}</div>
                </div>
                {c.unread > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                    {c.unread > 9 ? "9+" : c.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat panel */}
        <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a conversation to start replying.
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-xs font-bold text-primary-foreground overflow-hidden">
                  {activeConvo?.avatar_url ? (
                    <img src={activeConvo.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (activeConvo?.username?.[0] ?? "U").toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{activeConvo?.username ?? "User"}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{activeConvo?.email}</div>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-background/40">
                {msgs.map((m) => (
                  <div key={m.id} className={cn("flex", m.sender === "admin" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[70%] px-3 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap",
                        m.sender === "admin"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm",
                      )}
                    >
                      {m.message}
                      <div className={cn("text-[9px] mt-1 opacity-60", m.sender === "admin" ? "text-right" : "text-left")}>
                        {new Date(m.created_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="p-3 border-t border-border flex items-end gap-2"
              >
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Reply to user…"
                  rows={1}
                  maxLength={2000}
                  className="flex-1 resize-none bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 max-h-32"
                />
                <button
                  type="submit"
                  disabled={!text.trim() || sending}
                  className="h-9 px-4 rounded-xl bg-primary text-primary-foreground flex items-center gap-1.5 text-sm font-medium disabled:opacity-50 hover:opacity-90"
                >
                  <Send className="h-4 w-4" /> Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
