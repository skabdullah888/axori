import { useEffect, useState } from "react";
import { PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function toEmbedUrl(url: string): { kind: "iframe" | "video" | "link"; src: string } {
  if (!url) return { kind: "link", src: "" };
  try {
    const u = new URL(url);
    // YouTube
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return { kind: "iframe", src: `https://www.youtube.com/embed/${id}` };
      if (u.pathname.startsWith("/embed/")) return { kind: "iframe", src: url };
      if (u.pathname.startsWith("/shorts/")) {
        const id2 = u.pathname.split("/")[2];
        return { kind: "iframe", src: `https://www.youtube.com/embed/${id2}` };
      }
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1);
      return { kind: "iframe", src: `https://www.youtube.com/embed/${id}` };
    }
    // Vimeo
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return { kind: "iframe", src: `https://player.vimeo.com/video/${id}` };
    }
    // mp4/webm direct file
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(u.pathname)) return { kind: "video", src: url };
  } catch {
    /* ignore */
  }
  return { kind: "link", src: url };
}

export function TutorialButton({ sectionKey, label = "Watch tutorial" }: { sectionKey: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ title: string; video_url: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("section_videos")
        .select("title,video_url")
        .eq("section_key", sectionKey)
        .maybeSingle();
      setData((data as any) ?? null);
      setLoaded(true);
    })();
  }, [sectionKey]);

  if (!loaded || !data?.video_url) return null;
  const embed = toEmbedUrl(data.video_url);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <PlayCircle className="h-4 w-4 text-primary" />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{data.title || "How it works"}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
            {embed.kind === "iframe" ? (
              <iframe
                src={embed.src}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={data.title || "Tutorial video"}
              />
            ) : embed.kind === "video" ? (
              <video src={embed.src} controls className="h-full w-full" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                <a href={embed.src} target="_blank" rel="noreferrer" className="underline">
                  Open video
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
