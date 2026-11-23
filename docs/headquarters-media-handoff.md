# Headquarters media integration

## Approved sequence

1. `headquarters-establishing.mp4` — wide blue-hour headquarters exterior.
2. `headquarters-arrival.mp4` — closer entrance approach with warm timber portal and trading-floor reveal.

Both optimized MP4 files and their poster JPEGs are committed under `public/media/` on the `cinematic-redesign` branch:

- `public/media/headquarters-establishing.mp4`
- `public/media/headquarters-establishing.jpg`
- `public/media/headquarters-arrival.mp4`
- `public/media/headquarters-arrival.jpg`

The hero references these paths with the `NEXT_PUBLIC_BASE_PATH` prefix for GitHub Pages. Both muted, inline clips are scrubbed by scroll position inside a pinned two-viewport hero: the exterior establishing shot leads into the entrance approach, then the headquarters layer fades into the exchange film. Poster images remain underneath as visual fallbacks. Reduced-motion preferences disable video scrubbing and collapse the hero to one viewport.

## Validation

The `Cinematic redesign checks` GitHub Actions workflow runs the TypeScript check and static GitHub Pages build. The latest camera-path and loading changes are being validated on `cinematic-redesign`; see the branch Actions runs for the exact commit status.

Automated build success does not replace browser QA. Desktop/mobile layout, real autoplay behavior, clip transition, reduced-motion behavior, poster fallback, and the deployed `/Portfolio-site` base path still require visual verification.

## Repository hygiene and release boundary

The owner-uploaded originals remain at the repository root as source copies; the integration uses only the four normalized files in `public/media/`. No original uploads were deleted. The legacy briefcase source files and old endpoint frames remain in the repository as source history. The homepage camera is constrained to exchange scenes 1–3, and the film player no longer requests the legacy opening/closing holds or motion frames.

All work remains on `cinematic-redesign`. Do not merge into `main`, publish a release, or deploy without the owner's separate explicit approval.
