# Cinematic redesign — Stage 1 audit and creative specification

**Repository:** `Vasilisssss/Portfolio-site`  
**Working branch:** `cinematic-redesign`  
**Baseline:** `main`  
**Status:** Stage 1 — audit and direction only. No production redesign or deployment is authorized by this document.

## 1. Creative objective

Replace the briefcase-led narrative with an immersive journey into a premium investment institution. The first impression should be cinematic, credible and memorable: an exterior view of a distinctive headquarters, an approach to its entrance, then a reveal of the active trading floor and the investment operation.

The experience should feel like a carefully art-directed institutional brand film, not a sci-fi interface, game environment or generic fintech template. Visual quality is the leading priority, while financial clarity, trust and usability remain non-negotiable.

## 2. Proposed experience

1. **Headquarters / arrival** — full-viewport exterior establishing shot, restrained editorial headline and concise identity. The building is the hero; navigation and calls to action remain quiet.
2. **Approach / threshold** — camera advances towards the entrance. The visitor understands where they are going; movement should be deliberate and physically plausible.
3. **Trading floor** — transition through the entrance into the real-feeling institutional trading environment. The scene introduces the portfolio operation without obscuring the information.
4. **Investment collection** — holdings and allocation presented with premium editorial hierarchy and highly legible data visualisations.
5. **Performance** — honest, clearly labelled performance history with methodology and as-of date.
6. **Investment philosophy / close** — strategy, journal, about and contact, ending with a deliberate closing moment.

The chapter names and exact copy are provisional. Personal claims, investment rationale and biography must come from the site owner, not be invented.

## 3. Existing implementation audit

### Current structure

- Next.js 16 App Router, TypeScript, Tailwind CSS 4 and static export for GitHub Pages.
- Global shell in `app/layout.tsx`; page composition in `app/page.tsx`.
- Existing navigation is imported from `components/chrome/Nav`; smooth scroll, loader, cursor and grain are also mounted globally.
- The hero is `components/hero/Hero.tsx`.
- The persistent visual world is loaded through `components/world/WorldMount.tsx` and `components/world/World.tsx`.
- `components/world/film.ts` loads pre-rendered WebP stills and motion frames, scrubs them with scroll progress and overlays projected labels.
- The documented render pipeline uses Blender Cycles: `tools/film/world.py`, `tools/film/render.py`, and `tools/film/encode.py`.
- The current five-scene film and copy are explicitly briefcase-led. README documents five chapters: Reveal, Capital Engine, Investment Gallery, Performance Gallery and Final Reveal.

### Visual system

- Global tokens live in `app/globals.css`.
- Current palette is near-black with a vivid acid-lime accent (`#d7ff3f`), soft white text and restrained coral for losses.
- Typography uses Geist, Geist Mono and Instrument Serif.
- The current direction is dark and editorial, but the lime accent and briefcase/monolith visual language are strongly associated with the existing concept. The new direction should move towards quieter champagne/bronze warmth and architectural materials, using accent colour sparingly and preserving clear gain/loss semantics.

### Data integrity and privacy — preserve

- `lib/portfolio.ts` is documented and implemented as the single source of truth for portfolio calculations.
- `lib/public.ts` constructs the public view; `content/privacy.ts` controls which fields and sections are exposed.
- The public view strips hidden values before they reach HTML/client props. This boundary must remain intact.
- Performance uses broker time-weighted return where available, otherwise Modified Dietz; deposits are not to be represented as investment performance.
- The film build check fingerprints portfolio data so that rendered screens cannot silently become stale. Any replacement visual system that puts figures into imagery must retain equivalent freshness and privacy guarantees.
- Do not change financial formulas, source data, visibility defaults or disclosure policy as part of visual work without separate explicit approval.

### Known content debt

- `content/profile.ts` contains placeholders for name, email, biography, investing approach, vision and start year.
- Strategy is marked draft and includes draft-tagged principles.
- These cannot be made launch-ready through design alone. The owner must provide and approve the factual copy and contact details.

### Technical constraints / risks

- The current world is a pre-rendered film rather than a live 3D scene at runtime. The player depends on a manifest, stills and a frame sequence under `public/film`.
- The current player cover-crops a 16:9 film to fit the viewport; its subject-position metadata helps, but a new wide exterior composition still needs deliberate mobile-safe framing.
- Motion and media size, first-frame loading, decode memory, scroll synchronisation and fallback behaviour must be tested before choosing a full-screen film as the sole hero.
- The README and implementation descriptions should be reconciled during implementation where they differ; this audit does not assume unverified runtime details.
- Current render pipeline output described by `encode.py`: 1920×1080 stills at WebP quality 88; motion sequence at 1280×720 / quality 80; low-bandwidth motion at 854×480 / quality 78. These are current script settings, not a guarantee of final delivered visual quality.
- The new user-supplied MP4 assets need a frame-by-frame review in an accessible media viewer before selecting a definitive hero clip. The uploaded files were not directly inspectable through the repository connector during this audit, so no shot-by-shot quality verdict is recorded here.

## 4. Proposed art direction

**Mood:** institutional confidence, discretion, precision, permanence and ambition.

**Architecture:** contemporary global financial headquarters; dark stone, blackened metal, high-performance glass, bronze/champagne metal details and warm interior timber. Avoid implausible sci-fi forms and generic glass-tower stock imagery.

**Light:** blue-hour or early evening exterior; cool ambient sky balanced by warm interior illumination. Glass reflections should remain physically believable and not obscure the trading floor.

**Palette:** charcoal, graphite, midnight blue, warm neutral whites and restrained champagne/bronze. Keep green/red primarily for meaningful financial gain/loss signals rather than decorative glow.

**Typography:** editorial display face for a short statement, highly legible sans-serif for supporting copy and tabular/monospaced numerals for financial figures. Maintain a clear hierarchy and restrained word count.

**Motion:** slow, stable, physically plausible camera travel. Avoid fast fly-throughs, artificial lens flares, excessive bloom, gratuitous parallax and motion that competes with reading.

**Composition:** building dominates the opening; reserve clean negative space for the headline and navigation. Keep the entrance and illuminated trading floor readable. Create a separate mobile crop or mobile-specific composition rather than relying on a blind centre crop.

## 5. Landing-page design principles

- The first viewport should communicate what this is, who owns it (once the owner supplies identity), and why the visitor should continue.
- Use a minimal navigation system with clear destinations and no competing visual chrome.
- Keep primary copy short; let the architecture and controlled camera movement carry the emotional impact.
- Provide an obvious, accessible route to the portfolio data. The cinematic journey must never trap visitors or hide essential information.
- Use a poster/fallback image and progressive loading; the page must remain useful if video, WebGL or JavaScript fails.
- Respect `prefers-reduced-motion`, keyboard navigation, visible focus, contrast and mobile performance.
- Treat motion as progressive enhancement; provide pause/reduced-motion behaviour where needed.

## 6. Proposed technical direction (not yet implemented)

- Evaluate the supplied exterior clips as source footage and select the strongest continuous shot only after visual review.
- Prefer a short, seamless, carefully graded hero clip with a poster image, muted autoplay where permitted, and a clear static fallback.
- Plan a deliberate exterior-to-interior transition. It may be a cut/match cut or a continuous move; do not force a continuous AI-generated camera move if it introduces geometry drift or unstable people/screens.
- Keep the visual film independent from portfolio calculations. Where data appears in the environment, generate it only from the same privacy-filtered export and freshness checks already used by the project.
- Preserve the static-export/GitHub Pages deployment model unless a separately approved technical review demonstrates a necessary change.
- Benchmark desktop, mobile, low-bandwidth and reduced-motion paths before committing to a media-heavy architecture.

## 7. Acceptance criteria for the future prototype

- The first screen feels distinctive, premium and credible within seconds.
- Building geometry, materials, lighting and reflections look photographic rather than synthetic.
- The trading floor is visible and legible through the façade, without distracting screen clutter.
- Headline, navigation and primary portfolio entry point remain clear over the footage.
- No jarring crop, flicker, frame stutter, unwanted loop jump or intrusive loading state.
- Mobile has an intentional composition and does not merely inherit a desktop crop.
- The page remains readable and navigable with motion disabled or media unavailable.
- No placeholders are silently replaced with invented personal or financial claims.
- Financial calculations, privacy filtering, data freshness checks and disclaimers remain correct.

## 8. Stage gates and approval boundaries

- **Stage 1 (this document):** audit and creative specification.
- **Stage 2:** build a reviewable headquarters landing-page prototype on `cinematic-redesign`, using the approved footage and a safe fallback. Requires the owner's explicit approval before starting.
- **Stage 3:** design and prototype the exterior-to-interior transition. Requires approval.
- **Stage 4:** redesign trading-floor and investment environments. Requires approval.
- **Stage 5:** integrate the full portfolio experience and content. Requires approval.
- **Stage 6:** quality assurance and a deployment proposal. Publishing/merging/deployment always requires separate explicit approval.

**No changes to `main`, no merge, and no deployment are part of Stage 1.**
