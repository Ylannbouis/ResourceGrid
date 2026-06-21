"use client";

const ITEMS = [
  { label: "Offering", color: "bg-offer" },
  { label: "Need", color: "bg-need" },
  { label: "Claimed", color: "bg-claimed" },
];

const PRIORITY_ITEMS = [
  { label: "Critical", color: "bg-need", pulse: true },
  { label: "Urgent", color: "bg-claimed", pulse: false },
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
      <div className="my-0.5 h-px bg-slate-100" />
      {PRIORITY_ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span
            className={`h-3 w-3 rounded-full ${item.color} ${
              item.pulse ? "animate-pulse" : ""
            }`}
          />
          <span className="text-xs font-medium text-slate-600">{item.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <span className="text-[11px]">✓</span>
        <span className="text-xs font-medium text-slate-600">Verified</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full border-2 border-white bg-blue-600 shadow" />
        <span className="text-xs font-medium text-slate-600">You</span>
      </div>
    </div>
  );
}
