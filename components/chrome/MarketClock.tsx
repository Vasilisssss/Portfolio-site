"use client";
import { useEffect, useState } from "react";

/** NYSE regular-session status from New York local time (holidays not modelled). */
function read() {
  const parts: Record<string, string> = {};
  new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date())
    .forEach((p) => (parts[p.type] = p.value));
  const mins = +parts.hour * 60 + +parts.minute;
  const open = parts.weekday !== "Sat" && parts.weekday !== "Sun" && mins >= 570 && mins < 960;
  return { time: `${parts.hour}:${parts.minute}`, open };
}

export default function MarketClock() {
  const [s, setS] = useState<{ time: string; open: boolean } | null>(null);
  useEffect(() => {
    setS(read());
    const iv = setInterval(() => setS(read()), 15_000);
    return () => clearInterval(iv);
  }, []);
  return (
    <span className="tnum hidden items-center gap-2 text-[10px] tracking-[0.2em] text-mute md:flex" aria-live="off">
      <span className={`h-1.5 w-1.5 rounded-full ${s?.open ? "bg-ice-deep shadow-[0_0_0_3px_rgba(63,111,143,0.18)]" : "bg-line-2"}`} />
      {s ? `${s.open ? "NYSE OPEN" : "NYSE CLOSED"} · NY ${s.time}` : "NYSE · NY --:--"}
    </span>
  );
}
