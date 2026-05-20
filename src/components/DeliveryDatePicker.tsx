"use client";

import { cn } from "@/lib/utils/cn";

interface Props {
  dates: string[]; // ISO YYYY-MM-DD
  value: string | null;
  onChange: (next: string | null) => void;
}

function formatLabel(iso: string): string {
  // Local date so labels match the user's calendar regardless of timezone.
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function DeliveryDatePicker({ dates, value, onChange }: Props) {
  if (dates.length === 0) return null;
  return (
    <div className="-mx-4 px-4 overflow-x-auto">
      <div className="flex items-center gap-1.5 min-w-max">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 mr-1">
          Delivery
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium border transition-colors whitespace-nowrap",
            value === null
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300",
          )}
        >
          All
        </button>
        {dates.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onChange(value === d ? null : d)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium border transition-colors whitespace-nowrap",
              value === d
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-200 hover:border-slate-300",
            )}
          >
            {formatLabel(d)}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Pick the most appropriate default delivery date given today:
 * - The next date >= today, if any
 * - Otherwise, the most recent past date
 * - Returns null if no dates supplied
 */
export function pickDefaultDeliveryDate(dates: string[], today: Date = new Date()): string | null {
  if (dates.length === 0) return null;
  const sorted = [...dates].sort();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const upcoming = sorted.find((d) => d >= todayIso);
  return upcoming ?? sorted[sorted.length - 1];
}
