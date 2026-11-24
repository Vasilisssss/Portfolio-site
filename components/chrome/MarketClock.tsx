"use client";
import { useEffect, useState } from "react";

/**
 * Local time in the world's main market centres. Times only: it deliberately makes no claim about whether a market is
 * open (holidays and early closes are not modelled). Hong Kong joins on wide screens, where there is room.
 */
const MARKETS = [
  { code: "NYC", name: "New York", tz: "America/New_York" },
  { code: "LON", name: "London", tz: "Europe/London" },
  { code: "TYO", name: "Tokyo", tz: "Asia/Tokyo" },
  { code: "HKG", name: "Hong Kong", tz: "Asia/Hong_Kong", wide: true },
] as const;

const time = (tz: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());

export default function MarketClock() {
  const [now, setNow] = useState<string[] | null>(null);
  useEffect(() => {
    const update = () => setNow(MARKETS.map((m) => time(m.tz)));
    update();
    const iv = setInterval(update, 15_000);
    return () => clearInterval(iv);
  }, []);
  return (
    <ul className="tnum hidden items-center gap-3 text-[10px] tracking-[0.14em] 2xl:gap-4 2xl:tracking-[0.18em] text-white/55 md:flex" aria-label="Local time in major markets">
      {MARKETS.map((m, i) => (
        <li key={m.code} className={`items-center gap-1.5 ${"wide" in m && m.wide ? "hidden 2xl:flex" : "flex"}`} aria-label={`${m.name} ${now ? now[i] : ""}`} title={m.name}>
          <span aria-hidden className="h-1 w-1 rounded-full bg-ice-deep/80" />
          <span className="text-white/40">{m.code}</span>
          <span className="text-white/75">{now ? now[i] : "--:--"}</span>
        </li>
      ))}
    </ul>
  );
}
