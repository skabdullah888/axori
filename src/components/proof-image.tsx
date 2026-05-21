import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function extractProofPath(stored: string): string {
  if (!stored) return "";
  // Existing rows may contain full public URLs; extract the storage path after /proofs/
  const idx = stored.indexOf("/proofs/");
  if (idx >= 0) return stored.slice(idx + "/proofs/".length);
  return stored.replace(/^\/+/, "");
}

export function useProofUrl(stored: string | null | undefined) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    if (!stored) { setUrl(""); return; }
    const path = extractProofPath(stored);
    if (!path) { setUrl(""); return; }
    supabase.storage.from("proofs").createSignedUrl(path, 60 * 60).then(({ data }) => {
      if (!cancelled) setUrl(data?.signedUrl ?? "");
    });
    return () => { cancelled = true; };
  }, [stored]);
  return url;
}

export function ProofImage({ src, alt, className, onClick }: { src: string; alt?: string; className?: string; onClick?: () => void }) {
  const url = useProofUrl(src);
  if (!url) return <div className={(className ?? "") + " bg-muted animate-pulse"} />;
  return <img src={url} alt={alt} className={className} onClick={onClick} />;
}

export function ProofLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const url = useProofUrl(href);
  return <a href={url || "#"} target="_blank" rel="noreferrer" className={className}>{children}</a>;
}
