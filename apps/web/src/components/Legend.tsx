"use client";

const ITEMS = [
  { label: "Offering", color: "bg-offer" },
  { label: "Need", color: "bg-need" },
  { label: "Claimed", color: "bg-claimed" },
];

/** Small key so the color-coded map is self-explanatory at a glance. */
export function Legend() {
  return (
    <div className="pointer-events-auto absolute bottom-24 left-3 z-[1000] flex flex-col gap-1.5 rounded-2xl bg-white/95 p-3 shadow-card backdrop-blur">
      {ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${item.color}`} />
          <span className="text-xs font-medium text-slate-600">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
