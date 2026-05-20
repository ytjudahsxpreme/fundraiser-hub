"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Fundraiser } from "@/lib/data/types";
import { useAppState } from "@/lib/state/appState";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import { AccessGate } from "./AccessGate";

export function FundraiserShell({
  fundraiser,
  children,
}: {
  fundraiser: Fundraiser;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isUnlocked = useAppState((s) => s.unlockedFundraisers.includes(fundraiser.id));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  if (!hydrated) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className={`h-2 bg-gradient-to-r ${fundraiser.color}`} />
          <div className="p-6 text-center">
            <div
              className={`mx-auto flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${fundraiser.color} text-white text-3xl shadow-sm mb-3`}
              aria-hidden
            >
              {fundraiser.emoji}
            </div>
            <h2 className="text-base font-semibold">{fundraiser.name}</h2>
            <p className="text-sm text-slate-500 mt-1">
              This fundraiser requires an access code.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => router.push("/")}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <UnlockButton fundraiser={fundraiser} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <TopBar fundraiser={fundraiser} />
      <main className="flex-1 pb-24">{children}</main>
      <BottomNav fundraiserId={fundraiser.id} />
    </>
  );
}

function UnlockButton({ fundraiser }: { fundraiser: Fundraiser }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
      >
        Enter code
      </button>
      <AccessGate fundraiser={fundraiser} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
