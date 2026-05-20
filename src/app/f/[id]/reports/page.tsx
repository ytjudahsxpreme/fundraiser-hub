"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Papa from "papaparse";
import { dataSource } from "@/lib/data/dataSource";
import {
  BUILDING_ORDER,
  BUILDING_LABELS,
  type Building,
  type StudentOrder,
} from "@/lib/data/types";
import { sortByName } from "@/lib/utils/search";
import { cn } from "@/lib/utils/cn";

type GroupBy = "none" | "item" | "grade" | "building";

export default function ReportsPage() {
  const params = useParams<{ id: string }>();
  const fundraiserId = params?.id ?? "";
  const [orders, setOrders] = useState<StudentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupBy>("item");
  const [filterBuilding, setFilterBuilding] = useState<Building | null>(null);

  useEffect(() => {
    let cancelled = false;
    dataSource.listOrders(fundraiserId).then((data) => {
      if (!cancelled) {
        setOrders(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fundraiserId]);

  const filtered = useMemo(() => {
    return filterBuilding ? orders.filter((o) => o.building === filterBuilding) : orders;
  }, [orders, filterBuilding]);

  const groups = useMemo(() => groupOrders(filtered, groupBy), [filtered, groupBy]);

  function exportCsv() {
    const rows: Record<string, string | number> [] = [];
    for (const o of sortByName(filtered)) {
      for (const l of o.lines) {
        rows.push({
          Last: o.lastName,
          First: o.firstName,
          Grade: o.grade,
          Building: o.building,
          Item: l.itemName,
          Quantity: l.quantity,
          Identifier: l.identifier ?? "",
          Notes: o.notes ?? "",
        });
      }
    }
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fundraiserId}-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function printPickupList() {
    if (typeof window !== "undefined") window.print();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide mr-1">
          Group by
        </span>
        {(["none", "item", "grade", "building"] as GroupBy[]).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGroupBy(g)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium border transition-colors",
              groupBy === g
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-200 hover:border-slate-300",
            )}
          >
            {g === "none" ? "Flat list" : g[0].toUpperCase() + g.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide mr-1">
          Building
        </span>
        <button
          type="button"
          onClick={() => setFilterBuilding(null)}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium border transition-colors",
            !filterBuilding
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300",
          )}
        >
          All
        </button>
        {BUILDING_ORDER.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setFilterBuilding(b)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium border transition-colors",
              filterBuilding === b
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-200 hover:border-slate-300",
            )}
            title={BUILDING_LABELS[b]}
          >
            {b}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        <button
          type="button"
          onClick={exportCsv}
          disabled={loading || filtered.length === 0}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
          </svg>
          Export CSV
        </button>
        <button
          type="button"
          onClick={printPickupList}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2.5 hover:bg-slate-50"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print pickup list
        </button>
      </div>

      {loading ? (
        <div className="h-40 rounded-2xl bg-white border border-slate-200 animate-pulse" />
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <ReportGroup key={g.label} label={g.label} rows={g.rows} />
          ))}
          {groups.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">No orders to report.</p>
          )}
        </div>
      )}
    </div>
  );
}

interface ReportRow {
  studentKey: string;
  firstName: string;
  lastName: string;
  grade: string;
  building: Building;
  itemName?: string;
  identifier?: string;
  quantity: number;
}

function groupOrders(orders: StudentOrder[], groupBy: GroupBy) {
  const sorted = sortByName(orders);
  const groups = new Map<string, ReportRow[]>();

  if (groupBy === "item") {
    for (const o of sorted) {
      for (const l of o.lines) {
        const list = groups.get(l.itemName) ?? [];
        list.push({
          studentKey: o.id,
          firstName: o.firstName,
          lastName: o.lastName,
          grade: o.grade,
          building: o.building,
          quantity: l.quantity,
          identifier: l.identifier,
        });
        groups.set(l.itemName, list);
      }
    }
  } else if (groupBy === "grade") {
    for (const o of sorted) {
      const key = `Grade ${o.grade}`;
      const list = groups.get(key) ?? [];
      list.push({
        studentKey: o.id,
        firstName: o.firstName,
        lastName: o.lastName,
        grade: o.grade,
        building: o.building,
        quantity: o.totalQuantity,
      });
      groups.set(key, list);
    }
  } else if (groupBy === "building") {
    for (const o of sorted) {
      const key = BUILDING_LABELS[o.building];
      const list = groups.get(key) ?? [];
      list.push({
        studentKey: o.id,
        firstName: o.firstName,
        lastName: o.lastName,
        grade: o.grade,
        building: o.building,
        quantity: o.totalQuantity,
      });
      groups.set(key, list);
    }
  } else {
    if (sorted.length === 0) return [];
    const rows: ReportRow[] = sorted.map((o) => ({
      studentKey: o.id,
      firstName: o.firstName,
      lastName: o.lastName,
      grade: o.grade,
      building: o.building,
      quantity: o.totalQuantity,
    }));
    return [{ label: "All orders", rows }];
  }

  return Array.from(groups.entries())
    .map(([label, rows]) => ({ label, rows }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function ReportGroup({ label, rows }: { label: string; rows: ReportRow[] }) {
  const totalQty = rows.reduce((s, r) => s + r.quantity, 0);
  return (
    <section className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        <h3 className="text-sm font-semibold">{label}</h3>
        <div className="text-xs text-slate-500 tabular-nums">
          {rows.length} {rows.length === 1 ? "row" : "rows"} · {totalQty} items
        </div>
      </header>
      <ul className="divide-y divide-slate-100">
        {rows.map((r, i) => (
          <li key={`${r.studentKey}-${i}`} className="px-4 py-2.5 flex items-center gap-3 text-sm">
            <span className="flex-1 truncate">
              <span className="font-medium">
                {r.lastName}, {r.firstName}
              </span>
              <span className="text-slate-500 ml-2 text-xs">
                Gr {r.grade} · {r.building}
              </span>
              {r.identifier && (
                <span className="ml-2 inline-flex items-center rounded-md bg-slate-900/90 text-white text-[10px] font-mono px-1.5 py-0.5 tabular-nums">
                  {r.identifier}
                </span>
              )}
            </span>
            <span className="font-semibold tabular-nums">×{r.quantity}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
