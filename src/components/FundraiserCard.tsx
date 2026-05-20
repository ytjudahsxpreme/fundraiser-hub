"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Fundraiser } from "@/lib/data/types";
import { useAppState } from "@/lib/state/appState";
import { AccessGate } from "./AccessGate";

function summarizeItems(fundraiser: Fundraiser): string {
  const names = Array.from(
    new Set(fundraiser.sheetConfig.worksheets.flatMap((w) => w.items.map((i) => i.name))),
  );
  if (names.length === 0) return "No items configured";
  if (names.length <= 3) return names.join(" · ");
  return `${names.slice(0, 2).join(" · ")} · +${names.length - 2} more`;
}

export function FundraiserCard({ fundraiser }: { fundraiser: Fundraiser }) {
  const router = useRouter();
  const isUnlocked = useAppState((s) => s.unlockedFundraisers.includes(fundraiser.id));
  const [showGate, setShowGate] = useState(false);

  function onClick() {
    if (isUnlocked) {
      router.push(`/f/${fundraiser.id}/lookup`);
    } else {
      setShowGate(true);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md active:scale-[0.99] transition-all text-left p-5 w-full"
      >
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${fundraiser.color}`} />
        <div className="flex items-start gap-4">
          <div
            className={`flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${fundraiser.color} text-white text-3xl shadow-sm shrink-0`}
            aria-hidden
          >
            {fundraiser.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
              {fundraiser.classYear}
            </p>
            <h3 className="text-base font-semibold mt-0.5 leading-tight">{fundraiser.name}</h3>
            <p className="text-sm text-slate-500 mt-1 truncate">{summarizeItems(fundraiser)}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {isUnlocked ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium px-2 py-0.5">
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Unlocked
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium px-2 py-0.5">
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Locked
              </span>
            )}
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
        </div>
      </button>
      <AccessGate
        fundraiser={fundraiser}
        open={showGate}
        onClose={() => setShowGate(false)}
      />
    </>
  );
}
