# Headquarters media integration

## Approved sequence

1. `headquarters-establishing.mp4` — wide blue-hour headquarters exterior.
2. `headquarters-arrival.mp4` — closer entrance approach with warm timber portal and trading-floor reveal.

Both optimized MP4 files and their poster JPEGs are committed under `public/media/` on the `cinematic-redesign` branch:

- `public/media/headquarters-establishing.mp4`
- `public/media/headquarters-establishing.jpg`
- `public/media/headquarters-arrival.mp4`
- `public/media/headquarters-arrival.jpg`

The hero references these paths with the `NEXT_PUBLIC_BASE_PATH` prefix for GitHub Pages. The first muted, inline clip advances to the second on `ended`. The poster image remains underneath as a visual fallback; reduced-motion preferences hide the videos.

## Validation

The `Cinematic redesign checks` GitHub Actions workflow completed successfully for commit `037233fae119a4cec7971de8986b355665263a23`. That workflow runs the TypeScript check and static GitHub Pages build.

Automated build success does not replace browser QA. Desktop/mobile layout, real autoplay behavior, clip transition, reduced-motion behavior, poster fallback, and the deployed `/Portfolio-site` base path still require visual verification.

## Repository hygiene and release boundary

The owner-uploaded originals remain at the repository root as source copies; the integration uses only the four normalized files in `public/media/`. No original uploads were deleted. The legacy briefcase source files remain in the repository but are no longer mounted by the homepage.

All work remains on `cinematic-redesign`. Do not merge into `main`, publish a release, or deploy without the owner's separate explicit approval.
