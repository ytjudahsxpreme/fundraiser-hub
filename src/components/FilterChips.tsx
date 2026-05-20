"use client";

import { useState } from "react";
import {
  BUILDING_LABELS,
  BUILDING_ORDER,
  type Building,
  type LookupFilters,
} from "@/lib/data/types";
import { cn } from "@/lib/utils/cn";

interface ItemOption {
  id: string;
  name: string;
}

interface Props {
  filters: LookupFilters;
  onChange: (next: LookupFilters) => void;
  availableGrades: string[];
  availableItems: ItemOption[];
}

export function FilterChips({ filters, onChange, availableGrades, availableItems }: Props) {
  const [open, setOpen] = useState<null | "grade" | "building" | "item">(null);
  const anyActive = filters.grade || filters.building || filters.itemId;

  const activeItemName =
    filters.itemId && availableItems.find((i) => i.id === filters.itemId)?.name;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <FilterButton
          label="Building"
          value={filters.building ? filters.building : null}
          onOpen={() => setOpen(open === "building" ? null : "building")}
        />
        <FilterButton
          label="Grade"
          value={filters.grade}
          onOpen={() => setOpen(open === "grade" ? null : "grade")}
        />
        <FilterButton
          label="Item"
          value={activeItemName ?? null}
          onOpen={() => setOpen(open === "item" ? null : "item")}
        />
        {anyActive && (
          <button
            type="button"
            onClick={() =>
              onChange({ query: filters.query, grade: null, building: null, itemId: null })
            }
            className="text-xs font-medium text-slate-500 hover:text-slate-700 ml-1"
          >
            Clear
          </button>
        )}
      </div>

      {open === "building" && (
        <ChipRow>
          {BUILDING_ORDER.map((b) => (
            <Chip
              key={b}
              active={filters.building === b}
              onClick={() =>
                onChange({ ...filters, building: filters.building === b ? null : b })
              }
            >
              {b} <span className="text-slate-400 ml-1 font-normal">{BUILDING_LABELS[b]}</span>
            </Chip>
          ))}
          <CloseChip onClick={() => setOpen(null)} />
        </ChipRow>
      )}

      {open === "grade" && (
        <ChipRow>
          {availableGrades.map((g) => (
            <Chip
              key={g}
              active={filters.grade === g}
              onClick={() => onChange({ ...filters, grade: filters.grade === g ? null : g })}
            >
              {g}
            </Chip>
          ))}
          <CloseChip onClick={() => setOpen(null)} />
        </ChipRow>
      )}

      {open === "item" && (
        <ChipRow>
          {availableItems.map((it) => (
            <Chip
              key={it.id}
              active={filters.itemId === it.id}
              onClick={() =>
                onChange({ ...filters, itemId: filters.itemId === it.id ? null : it.id })
              }
            >
              {it.name}
            </Chip>
          ))}
          <CloseChip onClick={() => setOpen(null)} />
        </ChipRow>
      )}
    </div>
  );
}

function FilterButton({
  label,
  value,
  onOpen,
}: {
  label: string;
  value: string | Building | null | undefined;
  onOpen: () => void;
}) {
  const active = !!value;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors",
        active
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300",
      )}
    >
      <span>{label}</span>
      {active && <span className="opacity-80">: {value}</span>}
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-200 bg-white p-2">
      {children}
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-sm font-medium transition-colors",
        active
          ? "bg-slate-900 text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200",
      )}
    >
      {children}
    </button>
  );
}

function CloseChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-auto rounded-full p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
      aria-label="Close"
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  );
}
