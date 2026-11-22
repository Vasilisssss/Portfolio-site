/**
 * Ambient light aura behind the page (pure CSS, no image requests).
 * The film grain lives only in the WebGL background pass: nothing is ever drawn on top of text or figures.
 */
export default function Grain() {
  return <div aria-hidden className="aura"><span /><span /><span /><span /></div>;
}
