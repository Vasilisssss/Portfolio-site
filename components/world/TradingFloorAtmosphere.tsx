/**
 * A restrained architectural interlude for the trading-floor chapter.
 * Decorative only: all financial values remain sourced from the privacy-filtered
 * public view and are rendered by the existing Overview/Chapter components.
 */
export default function TradingFloorAtmosphere() {
  return (
    <div className="trading-floor-atmosphere" aria-hidden="true">
      <div className="trading-floor-ceiling" />
      <div className="trading-floor-gallery">
        <span /><span /><span /><span /><span /><span /><span />
      </div>
      <div className="trading-floor-glass" />
      <div className="trading-floor-deskline">
        {Array.from({ length: 8 }, (_, i) => <i key={i}><b /><b /><b /></i>)}
      </div>
      <div className="trading-floor-reflection" />
    </div>
  );
}
