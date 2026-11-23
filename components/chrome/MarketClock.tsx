"use client";
import { useEffect, useState } from "react";

/** New York local time. Deliberately avoids claiming a live market status on holidays or early-close sessions. */
function read() {
  const parts: Record<string, string> = {};
  new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date()).forEach((p) => (parts[p.type] = p.value));
  return `${parts.hour}:${parts.minute}`;
}

export default function MarketClock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setTime(read());
    update();
    const iv = setInterval(update, 15_000);
    return () => clearInterval(iv);
  }, []);
  return (
    <span className="tnum hidden items-center gap-2 text-[10px] tracking-[0.2em] text-white/55 md:flex" aria-label={time ? `New York local time ${time}` : "New York local time"}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#c9a779]" />
      {time ? `NEW YORK · ${time}` : "NEW YORK · --:--"}
    </span>
  );
}
