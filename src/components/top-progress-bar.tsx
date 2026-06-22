import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Slim, YouTube-style progress bar at the top of the viewport.
 * Watches TanStack Router's `isLoading` flag so it appears during route transitions.
 */
export function TopProgressBar() {
  const isLoading = useRouterState({ select: (s) => s.isLoading || s.isTransitioning });
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      setVisible(true);
      setProgress(10);
      let p = 10;
      timer.current = window.setInterval(() => {
        p = Math.min(p + Math.random() * 12, 88);
        setProgress(p);
      }, 220);
    } else {
      if (timer.current) window.clearInterval(timer.current);
      setProgress(100);
      hideTimer.current = window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 320);
    }
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [isLoading]);

  if (!visible) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-[100] h-0.5 pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary shadow-[0_0_10px_rgba(0,0,0,0.2)] shadow-primary/60 transition-[width,opacity] duration-300 ease-out"
        style={{ width: `${progress}%`, opacity: progress === 100 ? 0 : 1 }}
      />
    </div>
  );
}
