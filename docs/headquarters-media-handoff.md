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

The GitHub connector available for this work exposes text-file writes and Git objects, but this session has no direct path for streaming the attached archive bytes into the repository as binary assets. The prepared media package is therefore not yet committed to the repository. Once the four files are added, run:

- `npm run typecheck`
- `npm run build:pages`

Then visually verify the sequence on desktop and mobile, autoplay rejection, reduced motion, poster fallback, and the `/Portfolio-site` base path. Do not publish or deploy until those checks pass and the owner separately approves publication.


## Integration status and remaining work

- The hero component references the two MP4 paths above and uses `NEXT_PUBLIC_BASE_PATH` so the paths work under the GitHub Pages project subpath.
- The first clip advances to the arrival clip on `ended`; both are muted and inline. The CSS fallback remains visible if the files are missing or autoplay is blocked.
- The prepared media package has been transcoded to H.264/yuv420p with fast-start metadata and includes poster JPEGs. It is supplied separately as `headquarters-media-package.zip`.
- The GitHub connector can create binary Git blobs when given base64 content, but the current tool session cannot read the local ZIP bytes directly. Therefore the actual binary media still requires a repository upload; the code must not be described as fully media-integrated until that upload is verified.
- The homepage no longer mounts `WorldMount`, so the old briefcase film is no longer part of the visitor-facing homepage journey. Its source files and assets remain in the repository for reference; they have not been deleted. The trading-floor chapter now has a new CSS architectural atmosphere, but it is not yet a rendered 3D/video interior scene.
- No browser preview, build, typecheck or mobile-device QA has been run in this connector session. Run these checks after the media is committed and before any release.


## Latest implementation update

- The performance chapter's description string has been repaired.
- The homepage's old `WorldMount` / `worldFromView` import and render have been removed.
- A new `TradingFloorAtmosphere` component and layered CSS treatment provide an architectural atrium/workstation motif behind Chapter II. It is decorative; all actual figures still come from the existing privacy-filtered page data.
- The champagne/graphite design system and navigation are applied across the homepage.
- A CI workflow is configured to run typecheck and static Pages build on pushes to `cinematic-redesign`. Its result has not yet been confirmed.
- The MP4 and poster files are still not committed. The archive remains a separate handoff.
