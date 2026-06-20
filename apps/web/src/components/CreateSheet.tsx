"use client";

import { useState } from "react";
import {
  CATEGORIES,
  PinType,
  pinDetailsSchema,
  type PinDetailsInput,
} from "@resourcegrid/shared";
import { categoryIcon, categoryLabel, TYPE_LABEL } from "@/lib/pin-visuals";

interface CreateSheetProps {
  type: PinType;
  onProceed: (details: PinDetailsInput) => void;
  onCancel: () => void;
}

/**
 * Step 1 of creating a pin: collect the details. Submitting hands the validated
 * details up to the parent, which then lets the user place the pin on the map.
 */
export function CreateSheet({ type, onProceed, onCancel }: CreateSheetProps) {
  const isOffer = type === PinType.OFFER;
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    const parsed = pinDetailsSchema.safeParse({
      type,
      category,
      title: title.trim(),
      description: description.trim() || undefined,
      contact: contact.trim() || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    onProceed(parsed.data);
  };

  const accent = isOffer ? "bg-offer" : "bg-need";

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-t-2xl bg-white p-5 shadow-sheet sm:rounded-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />

        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <span className={`h-3 w-3 rounded-full ${accent}`} />
            {TYPE_LABEL[type]}
          </h2>
          <span className="text-xs text-slate-400">
            Add details, then place it on the map
          </span>
        </div>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Category
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                category === c
                  ? "bg-brand text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {categoryIcon(c)} {categoryLabel(c)}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          What&apos;s the situation?
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            isOffer ? "e.g. Generator + fuel to share" : "e.g. Need a water pump"
          }
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add any details (optional)"
          rows={2}
          className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light"
        />

        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Contact (optional) — phone or @handle"
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light"
        />

        {error && <p className="mt-2 text-sm text-need">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-md border border-slate-200 py-2.5 font-semibold text-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className={`flex-[2] rounded-md py-2.5 font-semibold text-white ${accent}`}
          >
            Choose location →
          </button>
        </div>
      </div>
    </div>
  );
}
