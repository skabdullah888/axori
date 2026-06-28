import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[100] pointer-events-none flex justify-center px-3 pt-3">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-amber-500/95 text-amber-950 px-4 py-2 text-xs font-semibold shadow-lg backdrop-blur">
        <WifiOff className="h-3.5 w-3.5" />
        You are offline — actions are paused until you reconnect
      </div>
    </div>
  );
}
