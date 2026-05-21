import React from "react";

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]])|(www\.[^\s<]+[^\s<.,:;"')\]])/gi;

export function Linkified({ text, className }: { text?: string | null; className?: string }) {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(URL_RE);
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    const url = match[0];
    const start = match.index;
    if (start > lastIndex) parts.push(text.slice(lastIndex, start));
    const href = url.startsWith("http") ? url : `https://${url}`;
    parts.push(
      <a
        key={key++}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 break-all hover:opacity-80"
      >
        {url}
      </a>
    );
    lastIndex = start + url.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return <span className={`whitespace-pre-wrap ${className ?? ""}`}>{parts}</span>;
}
