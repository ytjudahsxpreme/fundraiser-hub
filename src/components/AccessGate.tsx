"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Fundraiser } from "@/lib/data/types";
import { useAppState } from "@/lib/state/appState";

interface Props {
  fundraiser: Fundraiser;
  open: boolean;
  onClose: () => void;
}

export function AccessGate({ fundraiser, open, onClose }: Props) {
  const router = useRouter();
  const unlock = useAppState((s) => s.unlock);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setCode("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const ok = await unlock(fundraiser.id, code);
      if (ok) {
        router.push(`/f/${fundraiser.id}/lookup`);
      } else {
        setError("Incorrect access code. Try again.");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`h-2 bg-gradient-to-r ${fundraiser.color}`} />
        <form onSubmit={submit} className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${fundraiser.color} text-white text-2xl shadow-sm`}
              aria-hidden
            >
              {fundraiser.emoji}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                {fundraiser.classYear}
              </p>
              <h2 className="text-base font-semibold leading-tight">{fundraiser.name}</h2>
            </div>
          </div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="access-code">
            Access code
          </label>
          <input
            id="access-code"
            type="password"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (error) setError(null);
            }}
            autoFocus
            autoComplete="off"
            inputMode="text"
            placeholder="Enter code"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
          />
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 active:bg-slate-950 disabled:opacity-60"
            >
              {submitting ? "Checking…" : "Unlock"}
            </button>
          </div>
          <p className="mt-4 text-xs text-slate-500 text-center">
            Codes are managed in Settings by class advisors.
          </p>
        </form>
      </div>
    </div>
  );
}
