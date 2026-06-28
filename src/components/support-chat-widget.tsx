import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Headphones } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  user_id: string;
  sender: "user" | "admin";
  message: string;
  read_by_user: boolean;
  read_by_admin: boolean;
  created_at: string;
};

export function SupportChatWidget() {
  const { session, isAuthed } = useAuth();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [unread, setUnread] = useState(0);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const uid = session?.user?.id;

  const load = async () => {
    if (!uid) return;
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: true })
      .limit(200);
    const rows = (data as Msg[] | null) ?? [];
    setMsgs(rows);
    setUnread(rows.filter((m) => m.sender === "admin" && !m.read_by_user).length);
  };

  useEffect(() => {
    if (!uid) return;
    load();
    const ch = supabase
      .channel(`support-user-${uid}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_messages", filter: `user_id=eq.${uid}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, msgs.length]);

  useEffect(() => {
    if (!open || !uid) return;
    const unreadIds = msgs.filter((m) => m.sender === "admin" && !m.read_by_user).map((m) => m.id);
    if (unreadIds.length === 0) return;
    supabase
      .from("support_messages")
      .update({ read_by_user: true })
      .in("id", unreadIds)
      .then(() => setUnread(0));
  }, [open, msgs, uid]);

  const send = async () => {
    if (!uid || !text.trim() || sending) return;
    setSending(true);
    const body = text.trim().slice(0, 2000);
    setText("");
    const { error } = await supabase.from("support_messages").insert({
      user_id: uid,
      sender: "user",
      sender_id: uid,
      message: body,
    });
    if (error) setText(body);
    setSending(false);
  };

  if (!isAuthed || !uid) return null;

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed z-50 bottom-20 right-4 lg:bottom-6 lg:right-6 h-14 w-14 rounded-full",
          "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-xl shadow-primary/30",
          "flex items-center justify-center hover:scale-105 active:scale-95 transition-transform",
        )}
        aria-label="Support chat"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center border-2 border-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed z-50 bottom-36 right-4 lg:bottom-24 lg:right-6 w-[calc(100vw-2rem)] max-w-sm h-[70vh] max-h-[520px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="px-4 py-3 bg-gradient-to-r from-primary/20 to-primary/5 border-b border-border flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
              <Headphones className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Support</div>
              <div className="text-[10px] text-muted-foreground">Usually replies within a few hours</div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-background/40">
            {msgs.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-8 px-4">
                Hi! 👋 Apnar kono problem ba question thakle ekhane likhun — admin direct reply dibe.
              </div>
            )}
            {msgs.map((m) => (
              <div key={m.id} className={cn("flex", m.sender === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] px-3 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap",
                    m.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm",
                  )}
                >
                  {m.message}
                  <div className={cn("text-[9px] mt-1 opacity-60", m.sender === "user" ? "text-right" : "text-left")}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
            className="p-2 border-t border-border bg-card flex items-end gap-2"
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
              placeholder="Type a message…"
              rows={1}
              maxLength={2000}
              className="flex-1 resize-none bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 max-h-24"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 hover:opacity-90 shrink-0"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
