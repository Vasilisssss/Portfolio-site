"use client";
import { useEffect, useState } from "react";

/**
 * Local time in the world's main market centres, with a live open/closed state: a green, softly pulsing dot while the
 * exchange's regular session is open, grey when it is closed (nights, weekends, the Tokyo and Hong Kong lunch breaks,
 * exchange holidays and scheduled early closes). Hover a market for its status and the next open or close.
 *
 * Holidays and early closes are listed per exchange for 2026–2027 (from the exchanges' published calendars) and need a
 * yearly refresh; outside the listed years only weekends and hours are applied, and the tooltip says so. Unscheduled
 * closures (e.g. Hong Kong typhoon signals) cannot be known in advance. Hong Kong joins on wide screens.
 */
type Market = {
  code: string;
  name: string;
  exchange: string;
  tz: string;
  /** regular sessions, minutes after local midnight */
  sessions: [number, number][];
  holidays: string[];
  /** date → close time (minutes) on scheduled half days */
  early: Record<string, number>;
  years: number[];
  wide?: boolean;
};

const hm = (h: number, m = 0) => h * 60 + m;

const MARKETS: Market[] = [
  {
    code: "NYC", name: "New York", exchange: "NYSE / Nasdaq", tz: "America/New_York",
    sessions: [[hm(9, 30), hm(16)]],
    holidays: [
      "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25", "2026-06-19", "2026-07-03", "2026-09-07", "2026-11-26", "2026-12-25",
      "2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26", "2027-05-31", "2027-06-18", "2027-07-05", "2027-09-06", "2027-11-25", "2027-12-24",
    ],
    early: { "2026-11-27": hm(13), "2026-12-24": hm(13), "2027-11-26": hm(13) },
    years: [2026, 2027],
  },
  {
    code: "LON", name: "London", exchange: "London Stock Exchange", tz: "Europe/London",
    sessions: [[hm(8), hm(16, 30)]],
    holidays: [
      "2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04", "2026-05-25", "2026-08-31", "2026-12-25", "2026-12-28",
      "2027-01-01", "2027-03-26", "2027-03-29", "2027-05-03", "2027-05-31", "2027-08-30", "2027-12-27", "2027-12-28",
    ],
    early: { "2026-12-24": hm(12, 30), "2026-12-31": hm(12, 30), "2027-12-24": hm(12, 30), "2027-12-31": hm(12, 30) },
    years: [2026, 2027],
  },
  {
    code: "TYO", name: "Tokyo", exchange: "Tokyo Stock Exchange", tz: "Asia/Tokyo",
    sessions: [[hm(9), hm(11, 30)], [hm(12, 30), hm(15, 30)]],
    holidays: [
      "2026-01-01", "2026-01-02", "2026-01-12", "2026-02-11", "2026-02-23", "2026-03-20", "2026-04-29", "2026-05-04", "2026-05-05", "2026-05-06",
      "2026-07-20", "2026-08-11", "2026-09-21", "2026-09-22", "2026-09-23", "2026-10-12", "2026-11-03", "2026-11-23", "2026-12-31",
      "2027-01-01", "2027-01-11", "2027-02-11", "2027-02-23", "2027-03-22", "2027-04-29", "2027-05-03", "2027-05-04", "2027-05-05",
      "2027-07-19", "2027-08-11", "2027-09-20", "2027-09-23", "2027-10-11", "2027-11-03", "2027-11-23", "2027-12-31",
    ],
    early: {},
    years: [2026, 2027],
  },
  {
    code: "HKG", name: "Hong Kong", exchange: "Hong Kong Exchanges", tz: "Asia/Hong_Kong", wide: true,
    sessions: [[hm(9, 30), hm(12)], [hm(13), hm(16)]],
    holidays: [
      "2026-01-01", "2026-02-17", "2026-02-18", "2026-02-19", "2026-04-03", "2026-04-06", "2026-04-07", "2026-05-01", "2026-05-25",
      "2026-06-19", "2026-07-01", "2026-09-26", "2026-10-01", "2026-10-19", "2026-12-25",
      "2027-01-01", "2027-02-08", "2027-02-09", "2027-03-26", "2027-03-29", "2027-04-05", "2027-05-13", "2027-06-09", "2027-07-01",
      "2027-09-16", "2027-10-01", "2027-10-08", "2027-12-27",
    ],
    early: { "2026-02-16": hm(12), "2026-12-24": hm(12), "2026-12-31": hm(12), "2027-02-05": hm(12), "2027-12-24": hm(12), "2027-12-31": hm(12) },
    years: [2026, 2027],
  },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n: number) => String(n).padStart(2, "0");
const clock = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

/** the market's local calendar date and minute of day, right now */
function localNow(tz: string, at: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(at).map((x) => [x.type, x.value]),
  );
  return { y: +p.year, m: +p.month, d: +p.day, min: +p.hour * 60 + +p.minute };
}

/** sessions on a given local date (empty on weekends and holidays), early closes applied */
function sessionsOn(mk: Market, y: number, m: number, d: number) {
  const date = new Date(Date.UTC(y, m - 1, d));
  const key = date.toISOString().slice(0, 10);
  const dow = date.getUTCDay();
  if (dow === 0 || dow === 6 || mk.holidays.includes(key)) return { dow, list: [] as [number, number][] };
  const cut = mk.early[key];
  const list = cut == null ? mk.sessions : mk.sessions.filter(([s]) => s < cut).map(([s, e]) => [s, Math.min(e, cut)] as [number, number]);
  return { dow, list };
}

export type MarketState = { open: boolean; time: string; detail: string };

export function marketState(mk: Market, at = new Date()): MarketState {
  const now = localNow(mk.tz, at);
  const time = clock(now.min);
  const today = sessionsOn(mk, now.y, now.m, now.d).list;
  const current = today.find(([s, e]) => now.min >= s && now.min < e);
  const known = mk.years.includes(now.y) ? "" : " · holidays not listed for this year";
  if (current) {
    const i = today.indexOf(current);
    const last = today[today.length - 1];
    const lunch = i < today.length - 1 ? ` · lunch ${clock(current[1])}–${clock(today[i + 1][0])}` : "";
    return { open: true, time, detail: `Open${lunch} · closes ${clock(last[1])}${known}` };
  }
  const lunchNow = today.length > 1 && now.min >= today[0][1] && now.min < today[today.length - 1][0];
  for (let i = 0; i < 12; i++) {
    const { dow, list } = sessionsOn(mk, now.y, now.m, now.d + i);
    const next = list.find(([s]) => i > 0 || s > now.min);
    if (next) {
      const when = i === 0 ? "" : i === 1 ? "tomorrow " : `${DAYS[dow]} `;
      return { open: false, time, detail: `${lunchNow ? "Lunch break" : "Closed"} · opens ${when}${clock(next[0])}${known}` };
    }
  }
  return { open: false, time, detail: `Closed${known}` };
}

export default function MarketClock() {
  const [states, setStates] = useState<MarketState[] | null>(null);
  useEffect(() => {
    const update = () => setStates(MARKETS.map((m) => marketState(m)));
    update();
    const iv = setInterval(update, 15_000);
    return () => clearInterval(iv);
  }, []);
  return (
    <ul className="tnum hidden items-center gap-3 text-[10px] tracking-[0.14em] 2xl:gap-4 2xl:tracking-[0.18em] text-white/55 md:flex" aria-label="Local time and status of major stock markets">
      {MARKETS.map((m, i) => {
        const st = states?.[i];
        const open = !!st?.open;
        const tip = st ? `${m.name} · ${m.exchange} — ${st.detail} (local ${st.time})` : m.name;
        return (
          <li key={m.code} data-open={st ? String(open) : undefined}
            className={`items-center gap-1.5 ${m.wide ? "hidden 2xl:flex" : "flex"}`} aria-label={st ? `${m.name} ${st.time}, ${st.detail}` : m.name} title={tip}>
            <span aria-hidden className="relative flex h-1.5 w-1.5 items-center justify-center">
              {open && <span className="market-ping absolute inset-0 rounded-full bg-[#5fd08a]" />}
              <span className={`relative block h-1.5 w-1.5 rounded-full transition-colors duration-700 ${open ? "bg-[#5fd08a] shadow-[0_0_8px_rgba(95,208,138,.7)]" : "bg-white/25"}`} />
            </span>
            <span className={`transition-colors duration-700 ${open ? "text-[#8fdcaa]" : "text-white/35"}`}>{m.code}</span>
            <span className={`transition-colors duration-700 ${open ? "text-white/85" : "text-white/45"}`}>{st ? st.time : "--:--"}</span>
          </li>
        );
      })}
    </ul>
  );
}
