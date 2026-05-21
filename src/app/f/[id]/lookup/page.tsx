"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { DeliveryDatePicker, pickDefaultDeliveryDate } from "@/components/DeliveryDatePicker";
import { EmptyState } from "@/components/EmptyState";
import { FilterChips } from "@/components/FilterChips";
import { SearchBar } from "@/components/SearchBar";
import { StudentCard } from "@/components/StudentCard";
import { dataSource } from "@/lib/data/dataSource";
import { EMPTY_FILTERS, type LookupFilters, type StudentOrder } from "@/lib/data/types";
import { applyFilters, sortByName } from "@/lib/utils/search";

const POLL_INTERVAL_MS = 20_000;

export default function LookupPage() {
  const params = useParams<{ id: string }>();
  const fundraiserId = params?.id ?? "";
  const [orders, setOrders] = useState<StudentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<LookupFilters>(EMPTY_FILTERS);
  const [defaultedDate, setDefaultedDate] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);

  // Used so an in-flight fetch from an earlier fundraiserId can be ignored
  // if the user navigates between fundraisers.
  const activeFundraiserRef = useRef(fundraiserId);
  activeFundraiserRef.current = fundraiserId;

  const fetchOrders = useCallback(
    async (opts: { initial: boolean }) => {
      if (!fundraiserId) return;
      if (opts.initial) setLoading(true);
      try {
        const data = await dataSource.listOrders(fundraiserId);
        if (activeFundraiserRef.current !== fundraiserId) return;
        setOrders(data);
        setLastUpdated(new Date());
        setPollError(null);
      } catch (err) {
        if (activeFundraiserRef.current !== fundraiserId) return;
        if (opts.initial) {
          console.error("Failed to load orders:", err);
        }
        setPollError((err as Error).message ?? "Refresh failed");
      } finally {
        if (opts.initial) setLoading(false);
      }
    },
    [fundraiserId],
  );

  // Initial load.
  useEffect(() => {
    fetchOrders({ initial: true });
  }, [fetchOrders]);

  // Background polling. Skip when tab is hidden to save Sheets quota.
  useEffect(() => {
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchOrders({ initial: false });
    };
    const id = window.setInterval(tick, POLL_INTERVAL_MS);
    // Also re-fetch immediately when the tab regains focus.
    const onVisibilityChange = () => {
      if (!document.hidden) fetchOrders({ initial: false });
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fetchOrders]);

  // Collect all distinct delivery dates from the loaded orders.
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    for (const o of orders) {
      for (const l of o.lines) if (l.deliveryDate) set.add(l.deliveryDate);
    }
    return Array.from(set).sort();
  }, [orders]);

  // First time we see dates, default to today's / next upcoming.
  useEffect(() => {
    if (defaultedDate) return;
    if (availableDates.length === 0) return;
    const def = pickDefaultDeliveryDate(availableDates);
    setFilters((f) => ({ ...f, deliveryDate: def }));
    setDefaultedDate(true);
  }, [availableDates, defaultedDate]);

  const filtered = useMemo(() => {
    const base = sortByName(applyFilters(orders, filters));
    if (!filters.deliveryDate) return base;
    const out: StudentOrder[] = [];
    for (const o of base) {
      const lines = o.lines.filter((l) => l.deliveryDate === filters.deliveryDate);
      if (lines.length === 0) continue;
      const totalQuantity = lines.reduce((s, l) => s + l.quantity, 0);
      out.push({ ...o, lines, totalQuantity });
    }
    return out;
  }, [orders, filters]);

  const totals = useMemo(() => {
    const items = filtered.reduce((s, o) => s + o.totalQuantity, 0);
    return { students: filtered.length, items };
  }, [filtered]);

  const availableGrades = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => { if (o.grade) set.add(o.grade); });
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

  const anyFilterActive =
    filters.query || filters.grade || filters.building || filters.itemId;

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
      <div className="space-y-3 sticky top-14 z-10 -mx-4 px-4 py-2 bg-slate-50/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80">
        <SearchBar
          value={filters.query}
          onChange={(query) => setFilters((f) => ({ ...f, query }))}
        />
        {availableDates.length > 0 && (
          <DeliveryDatePicker
            dates={availableDates}
            value={filters.deliveryDate}
            onChange={(d) => setFilters((f) => ({ ...f, deliveryDate: d }))}
          />
        )}
        <FilterChips
          filters={filters}
          onChange={setFilters}
          availableGrades={availableGrades}
          availableItems={availableItems}
        />
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-2">
            <LiveIndicator
              lastUpdated={lastUpdated}
              pollError={pollError}
              loading={loading}
            />
            <span>
              {loading
                ? "Loading…"
                : `${totals.students} student${totals.students === 1 ? "" : "s"} · ${totals.items} item${totals.items === 1 ? "" : "s"}`}
            </span>
          </span>
          {orders.length > 0 && filtered.length !== orders.length && (
            <span>{orders.length - filtered.length} hidden</span>
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
          title={anyFilterActive || filters.deliveryDate ? "No matching students" : "No orders yet"}
          description={
            anyFilterActive || filters.deliveryDate
              ? "Try a shorter name, pick a different delivery date, or clear filters."
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

function LiveIndicator({
  lastUpdated,
  pollError,
  loading,
}: {
  lastUpdated: Date | null;
  pollError: string | null;
  loading: boolean;
}) {
  // Tick once per second so the "Xs ago" caption stays current.
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (loading) return null;
  if (pollError) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-rose-700"
        title={`Refresh failed: ${pollError}`}
      >
        <span className="w-2 h-2 rounded-full bg-rose-500" />
        <span className="font-medium">Offline</span>
      </span>
    );
  }
  if (!lastUpdated) return null;
  const ageSec = Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / 1000));
  const ageLabel = ageSec < 5 ? "just now" : `${ageSec}s ago`;
  return (
    <span className="inline-flex items-center gap-1.5 text-emerald-700">
      <span className="relative flex w-2 h-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
        <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
      </span>
      <span className="font-medium">Live</span>
      <span className="text-slate-400 font-normal">· {ageLabel}</span>
    </span>
  );
}
