import { useRef } from "react";

/** Keep keys in sync with backend app/prompts.yml */
export const STYLES = [
  { key: "none", label: "No Style", icon: PortraitIcon },
  { key: "photo_portrait_bokeh", label: "Portrait 85mm f/1.8", icon: BokehIcon },
  { key: "photo_highkey_beauty", label: "High-Key Beauty", icon: SoftboxIcon },
  { key: "photo_street_candid", label: "Street 35mm", icon: StreetIcon },
  { key: "photo_golden_hour", label: "Golden Hour", icon: SunIcon },
  { key: "photo_night_long_exposure", label: "Night Long Exp.", icon: CityNightIcon },
  { key: "photo_macro_detail", label: "Macro 1:1", icon: MacroIcon },
  { key: "photo_product_flatlay", label: "Product Flat-Lay", icon: FlatlayIcon },
  { key: "photo_studio_fashion", label: "Studio Fashion", icon: FashionIcon },
  { key: "photo_bw_film_noir", label: "B&W Film Noir", icon: FilmIcon },
  { key: "photo_landscape_epic", label: "Landscape Epic", icon: LandscapeIcon },
];

function Arrow({ dir = "left" }) {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      {dir === "left" ? (
        <path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
      ) : (
        <path fill="currentColor" d="M8.59 16.59 10 18l6-6-6-6-1.41 1.41L13.17 12z" />
      )}
    </svg>
  );
}

function StyleCard({ item, selected, onSelect }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(item.key)}
      className={[
        "shrink-0 snap-start w-40 sm:w-44 p-3 rounded-2xl text-left",
        "bg-zinc-900/70 border transition-colors",
        selected
          ? "border-indigo-500 ring-2 ring-indigo-500/40"
          : "border-zinc-800 hover:border-zinc-700",
      ].join(" ")}
      aria-pressed={selected}
      aria-label={`Select style: ${item.label}`}
    >
      <div className="flex items-center justify-center h-24 rounded-xl bg-zinc-800/70 border border-zinc-700 mb-3">
        <Icon className="w-12 h-12 text-zinc-300" />
      </div>
      <div className="text-xs text-zinc-400">Style</div>
      <div className="text-sm font-semibold text-white mt-0.5 leading-snug">{item.label}</div>
    </button>
  );
}

export default function StyleCarousel({ value, onChange, title = "Choose a style" }) {
  const scrollerRef = useRef(null);
  const scroll = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    const delta = dir === "left" ? -320 : 320;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm sm:text-base font-semibold">{title}</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700"
            aria-label="Scroll left"
          >
            <Arrow dir="left" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700"
            aria-label="Scroll right"
          >
            <Arrow dir="right" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="relative overflow-x-auto hide-scrollbar snap-x snap-mandatory flex gap-3 sm:gap-4 pb-2"
        role="listbox"
        aria-label="Style carousel"
      >
        {STYLES.map((s) => (
          <StyleCard
            key={s.key}
            item={s}
            selected={s.key === value}
            onSelect={onChange}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------------- SVG ICONS (simple, lightweight) ---------------- */

function PortraitIcon(props) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <circle cx="24" cy="18" r="8" fill="currentColor" />
      <rect x="10" y="30" width="28" height="10" rx="5" fill="currentColor" />
    </svg>
  );
}
function BokehIcon(props) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <circle cx="16" cy="24" r="6" fill="currentColor" opacity="0.7" />
      <circle cx="28" cy="20" r="8" fill="currentColor" opacity="0.5" />
      <circle cx="32" cy="30" r="6" fill="currentColor" opacity="0.4" />
      <circle cx="22" cy="32" r="5" fill="currentColor" opacity="0.35" />
    </svg>
  );
}
function SoftboxIcon(props) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <rect x="10" y="10" width="20" height="20" transform="rotate(15 20 20)" stroke="currentColor" fill="none" strokeWidth="3" />
      <rect x="30" y="20" width="4" height="18" fill="currentColor" />
    </svg>
  );
}
function StreetIcon(props) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <path d="M6 36h36" stroke="currentColor" strokeWidth="3" />
      <rect x="10" y="18" width="10" height="12" fill="currentColor" />
      <rect x="26" y="12" width="12" height="18" fill="currentColor" />
      <circle cx="20" cy="36" r="3" fill="currentColor" />
      <circle cx="30" cy="36" r="3" fill="currentColor" />
    </svg>
  );
}
function SunIcon(props) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <circle cx="24" cy="24" r="8" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <path d="M24 6v6M24 36v6M6 24h6M36 24h6M10 10l4 4M34 34l4 4M10 38l4-4M34 14l4-4" />
      </g>
    </svg>
  );
}
function CityNightIcon(props) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <rect x="8" y="18" width="10" height="18" fill="currentColor" />
      <rect x="22" y="12" width="10" height="24" fill="currentColor" />
      <rect x="36" y="22" width="4" height="14" fill="currentColor" />
      <circle cx="12" cy="22" r="1" fill="#fff" />
      <circle cx="26" cy="16" r="1" fill="#fff" />
      <circle cx="26" cy="20" r="1" fill="#fff" />
      <path d="M6 38h36" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
function MacroIcon(props) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <circle cx="20" cy="24" r="8" stroke="currentColor" strokeWidth="3" fill="none" />
      <rect x="28" y="20" width="10" height="8" rx="3" fill="currentColor" />
    </svg>
  );
}
function FlatlayIcon(props) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="3" fill="none" />
      <rect x="14" y="14" width="10" height="10" fill="currentColor" />
      <rect x="28" y="14" width="6" height="6" fill="currentColor" />
      <rect x="28" y="22" width="10" height="10" fill="currentColor" />
    </svg>
  );
}
function FashionIcon(props) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <path d="M18 16c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="3" fill="none" />
      <path d="M12 20l6-2 4 14h-8l-2 6H8l4-18zM36 20l-6-2-4 14h8l2 6h4l-4-18z" fill="currentColor" />
    </svg>
  );
}
function FilmIcon(props) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <rect x="10" y="12" width="28" height="24" rx="2" stroke="currentColor" strokeWidth="3" fill="none" />
      <circle cx="18" cy="24" r="3" fill="currentColor" />
      <circle cx="30" cy="24" r="3" fill="currentColor" />
      <path d="M10 16h28M10 32h28" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function LandscapeIcon(props) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <path d="M6 36h36" stroke="currentColor" strokeWidth="3" />
      <path d="M10 30l7-9 7 9H10zM26 30l6-8 10 8H26z" fill="currentColor" />
      <circle cx="16" cy="14" r="3" fill="currentColor" />
    </svg>
  );
}
