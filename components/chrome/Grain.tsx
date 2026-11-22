/** Ambient light auras + a whisper of film grain. Pure CSS/SVG, no image requests. */
export default function Grain() {
  return (
    <>
      <div aria-hidden className="aura"><span /><span /><span /><span /></div>
      <svg aria-hidden className="pointer-events-none fixed inset-0 z-[120] h-full w-full opacity-[0.06] mix-blend-overlay">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </>
  );
}
