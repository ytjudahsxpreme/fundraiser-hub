"use client";

import Link from "next/link";
import type { Fundraiser } from "@/lib/data/types";
import { useAppState } from "@/lib/state/appState";

export function TopBar({ fundraiser }: { fundraiser: Fundraiser }) {
  const lock = useAppState((s) => s.lock);
  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-slate-200">
      <div className="mx-auto max-w-3xl px-4 h-14 flex items-center gap-3">
        <div
          className={`flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br ${fundraiser.color} text-white text-lg shadow-sm`}
          aria-hidden
        >
          {fundraiser.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-slate-500 leading-none">
            {fundraiser.classYear}
          </p>
          <h1 className="text-sm font-semibold truncate leading-tight">{fundraiser.name}</h1>
        </div>
        <Link
          href="/"
          onClick={() => lock(fundraiser.id)}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors"
        >
          Switch
        </Link>
      </div>
    </header>
  );
}
