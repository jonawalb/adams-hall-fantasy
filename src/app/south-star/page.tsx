import SouthStar from "@/components/SouthStar";

function SouthCompass() {
  return (
    <svg viewBox="0 0 100 100" className="h-20 w-20 sm:h-24 sm:w-24" aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.5" />
      {/* Needle: points due south, obviously */}
      <polygon points="50,90 42,50 58,50" fill="currentColor" />
      <polygon points="50,10 42,50 58,50" fill="currentColor" opacity="0.25" />
      <circle cx="50" cy="50" r="4" fill="currentColor" />
      <text x="50" y="97" textAnchor="middle" fontSize="9" fontFamily="var(--font-head), sans-serif" fontWeight="700" fill="currentColor">S</text>
    </svg>
  );
}

export default function SouthStarPage() {
  return (
    <div className="space-y-8">
      <header className="rise border-b-2 border-gold-deep pb-6">
        <div className="flex items-center gap-5">
          <div className="text-gold">
            <SouthCompass />
          </div>
          <div>
            <p className="kicker">SouthStar Media · A New Way Backward</p>
            <h1 className="font-display mt-1 text-4xl leading-none text-gold-bright sm:text-5xl">
              THE SOUTH STAR NARRATIVE
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-cream-dim">
              A monthly deep dive into the issues that matter least. Rebuilding toxic engagement at
              the league and group-chat level, one dispatch at a time. Any member may publish under
              any byline. Editorial standards: none.
            </p>
          </div>
        </div>
      </header>
      <SouthStar />
    </div>
  );
}
