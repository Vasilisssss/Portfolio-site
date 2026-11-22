/** Static film grain overlay — pure SVG, no image request, composited once. */
export default function Grain() {
  return (
    <svg aria-hidden className="pointer-events-none fixed inset-0 z-[120] h-full w-full opacity-[0.07] mix-blend-overlay">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  );
}
