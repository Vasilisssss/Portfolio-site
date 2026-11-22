import Link from "next/link";

export default function NotFound() {
  return (
    <section className="container-x flex min-h-[80svh] flex-col justify-center gap-8 pt-32">
      <span className="eyebrow text-gold">404</span>
      <h1 className="display text-[clamp(52px,8vw,140px)] leading-[0.92]">Off the map.</h1>
      <p className="max-w-[460px] text-silver">The page you were looking for has moved or never existed.</p>
      <Link href="/" className="inline-flex h-14 w-fit items-center rounded-full bg-ivory px-7 text-[11px] uppercase tracking-[0.24em] text-ink hover:bg-gold">Return home</Link>
    </section>
  );
}
