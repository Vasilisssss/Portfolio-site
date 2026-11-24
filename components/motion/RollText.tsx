"use client";

/**
 * ROLL TEXT — hover state for links and buttons.
 * Choreography: on hover (or keyboard focus of the parent .roll-host) the label slides up out of its line and an
 * identical copy rolls in from below (CSS transform, --ease-expo). Screen readers get the label once.
 */
export default function RollText({ children, className }: { children: string; className?: string }) {
  return (
    <span className={`roll ${className ?? ""}`}>
      <span className="roll-a">{children}</span>
      <span className="roll-b" aria-hidden>{children}</span>
    </span>
  );
}
