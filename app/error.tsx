"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="container-x flex min-h-[80svh] flex-col justify-center gap-8 pt-32" role="alert">
      <span className="eyebrow text-gold">Something went wrong</span>
      <h1 className="display text-[clamp(48px,7vw,120px)] leading-[0.92]">A brief interruption.</h1>
      <p className="max-w-[460px] text-silver">This section couldn’t load. Your data is safe — please try again.</p>
      <button type="button" onClick={reset} className="inline-flex h-14 w-fit items-center rounded-full bg-ivory px-7 text-[11px] uppercase tracking-[0.24em] text-ink hover:bg-gold">Try again</button>
    </section>
  );
}
