"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { FilterChips } from "@/components/FilterChips";
import { SearchBar } from "@/components/SearchBar";
import { StudentCard } from "@/components/StudentCard";
import { dataSource } from "@/lib/data/dataSource";
import { EMPTY_FILTERS, type LookupFilters, type StudentOrder } from "@/lib/data/types";
import { applyFilters, sortByName } from "@/lib/utils/search";

export default function LookupPage() {
  const params = useParams<{ id: string }>();
  const fundraiserId = params?.id ?? "";
  const [orders, setOrders] = useState<StudentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<LookupFilters>(EMPTY_FILTERS);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
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

  const filtered = useMemo(() => sortByName(applyFilters(orders, filters)), [orders, filters]);

  const totals = useMemo(() => {
    const items = filtered.reduce((s, o) => s + o.totalQuantity, 0);
    return { students: filtered.length, items };
  }, [filtered]);

  const availableGrades = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => set.add(o.grade));
    return Array.from(set).sort((a, b) => {
      const order = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
      return order.indexOf(a) - order.indexOf(b);
    });
  }, [orders]);

  const availableItems = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => o.lines.forEach((l) => map.set(l.itemId, l.itemName)));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [orders]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
      <div className="space-y-3 sticky top-14 z-10 -mx-4 px-4 py-2 bg-slate-50/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80">
        <SearchBar
          value={filters.query}
          onChange={(query) => setFilters((f) => ({ ...f, query }))}
        />
        <FilterChips
          filters={filters}
          onChange={setFilters}
          availableGrades={availableGrades}
          availableItems={availableItems}
        />
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            {loading
              ? "Loading…"
              : `${totals.students} student${totals.students === 1 ? "" : "s"} · ${totals.items} item${totals.items === 1 ? "" : "s"}`}
          </span>
          {orders.length > 0 && filtered.length !== orders.length && (
            <span>{orders.length - filtered.length} hidden by filters</span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={filters.query || filters.grade || filters.building || filters.itemId ? "No matching students" : "No orders yet"}
          description={
            filters.query || filters.grade || filters.building || filters.itemId
              ? "Try a shorter name or clear some filters."
              : "Once the linked Google Sheet has data, orders will appear here."
          }
          icon={
            <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((o) => (
            <li key={o.id}>
              <StudentCard order={o} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
