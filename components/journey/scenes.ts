import scenesJson from "@/public/scenes/manifest.json";
import walkJson from "@/public/media/journey/manifest.json";

/**
 * The journey's still rooms (public/scenes) and the walk's manifest (public/media/journey), read at build time so
 * server components can lay the page out around them (poster sizes, the doors frame) without a request.
 */
export interface SceneInfo { id: string; chapter: number | null; role?: string; zoomOrigin: [number, number]; focusX: number; alt: string }
export const SCENES: SceneInfo[] = (scenesJson as unknown as SceneInfo[]).map((s) => ({ ...s, zoomOrigin: [s.zoomOrigin[0], s.zoomOrigin[1]] }));
export const ROOMS = SCENES.filter((s) => s.chapter != null).sort((a, b) => (a.chapter ?? 0) - (b.chapter ?? 0));
export const CLOSING = SCENES.find((s) => s.role === "closing")!;
export const WALK = walkJson as { w: number; h: number; frames: number; doors: number; join: number; poster: string; posterSm: string; last: string };

export const base = () => process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export type Variant = "wide" | "wide-sm" | "tall" | "tall-sm";
export const sceneSrc = (id: string, v: Variant) => `${base()}/scenes/${id}-${v}.webp`;
export const walkSrc = (file: string) => `${base()}/media/journey/${file}`;
/** the trading floor, seen at the end of the walk (just through the revolving door): where the camera hands off into the rooms */
export const FLOOR = { id: "floor", zoomOrigin: [0.5, 0.5] as [number, number], focusX: 0.5, alt: "The trading floor inside the headquarters" };
