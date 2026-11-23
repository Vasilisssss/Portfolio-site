# Stage 2 media handoff

The headquarters hero now sequences two same-origin MP4 sources:

1. `/media/headquarters-establishing.mp4` — use the second uploaded clip (wide exterior / financial-district establishing view).
2. `/media/headquarters-arrival.mp4` — use the first uploaded clip (closer entrance / warm timber reveal).

Place the files in `public/media/` with those exact names. The hero includes a CSS fallback if media is absent or autoplay is blocked. The video elements are muted and inline; the first clip advances to the second when it ends. The second clip holds on its final frame.

Optional poster files:
- `public/media/headquarters-establishing.jpg`
- `public/media/headquarters-arrival.jpg`

Posters should be 16:9, compressed WebP/JPEG and composed with the building/entrance visible in the centre-safe area. For production, add an intentional mobile poster/crop and verify the footage with reduced-motion enabled.

**Current limitation:** the attached MP4 files are available in this chat workspace, but the GitHub connector used for these edits exposes text-file writes and does not provide a binary upload action for the multi-megabyte MP4s. Therefore the component references the intended paths, but the videos themselves have not yet been committed to the repository. Do not treat the media sequence as live until both MP4s are present at those paths and the site is tested.
