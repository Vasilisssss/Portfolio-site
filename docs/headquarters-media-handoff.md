# Stage 2 media handoff

## Approved sequence

1. `headquarters-establishing.mp4` — the wider blue-hour exterior establishing view (source asset suffix `85bd09f5`).
2. `headquarters-arrival.mp4` — the closer entrance view with the warm timber portal and trading floor reveal (source asset suffix `cd2003a7`).

Both original clips are 1280×720, 24 fps and approximately 7.9 seconds. The supplied source videos have been re-encoded as H.264 MP4 with fast-start metadata, no audio track, 24 fps and 1280×720 output. Poster frames have been extracted at 3.2s (establishing) and 4.0s (arrival).

## Files to place in `public/media/`

- `headquarters-establishing.mp4`
- `headquarters-establishing.jpg`
- `headquarters-arrival.mp4`
- `headquarters-arrival.jpg`

The site component uses `NEXT_PUBLIC_BASE_PATH` for GitHub Pages compatibility. The first clip advances to the second on `ended`. If autoplay is blocked or reduced motion is enabled, the static establishing poster remains visible. The video remains muted and inline.

## Local package

The prepared archive `headquarters-media-package.zip` contains all four files under the `public/media/` folder structure. Upload/extract it into the repository root so the final paths match the list above.

## Verification still required

The GitHub connector available for this work exposes text-file writes and Git objects, but not a direct binary upload from the attached-file workspace. The prepared media package is therefore not yet committed to the repository. Once the four files are added, run:

- `npm run typecheck`
- `npm run build:pages`

Then visually verify the sequence on desktop and mobile, autoplay rejection, reduced motion, poster fallback, and the `/Portfolio-site` base path. Do not publish or deploy until those checks pass and the owner separately approves publication.


## Integration status and remaining work

- The hero component references the two MP4 paths above and uses `NEXT_PUBLIC_BASE_PATH` so the paths work under the GitHub Pages project subpath.
- The first clip advances to the arrival clip on `ended`; both are muted and inline. The CSS fallback remains visible if the files are missing or autoplay is blocked.
- The prepared media package has been transcoded to H.264/yuv420p with fast-start metadata and includes poster JPEGs. It is supplied separately as `headquarters-media-package.zip`.
- The GitHub connector can create binary Git blobs when given base64 content, but the current tool session cannot read the local ZIP bytes directly. Therefore the actual binary media still requires a repository upload; the code must not be described as fully media-integrated until that upload is verified.
- The existing fixed background film in `components/world/World.tsx` and `components/world/film.ts` still represents the former briefcase concept. It must be replaced or re-authored as the headquarters/trading-floor cinematic environment before the scroll journey is considered complete. Merely changing the hero does not replace the old film.
- No browser preview, build, typecheck or mobile-device QA has been run in this connector session. Run these checks after the media is committed and before any release.
