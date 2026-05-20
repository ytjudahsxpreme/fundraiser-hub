"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dataSource } from "@/lib/data/dataSource";
import {
  BUILDING_LABELS,
  BUILDING_ORDER,
  type Building,
  type StudentOrder,
} from "@/lib/data/types";

const BUILDING_COLORS: Record<Building, string> = {
  LE: "#0ea5e9",
  UE: "#22c55e",
  MS: "#f59e0b",
  HS: "#ef4444",
};

export default function DashboardPage() {
  const params = useParams<{ id: string }>();
  const fundraiserId = params?.id ?? "";
  const [orders, setOrders] = useState<StudentOrder[]>([]);
  const [loading, setLoading] = useState(true);

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

  const stats = useMemo(() => {
    let totalItems = 0;
    const uniqueItemIds = new Set<string>();
    for (const o of orders) {
      totalItems += o.totalQuantity;
      for (const l of o.lines) uniqueItemIds.add(l.itemId);
    }
    return { totalItems, uniqueStudents: orders.length, uniqueItems: uniqueItemIds.size };
  }, [orders]);

  const byItem = useMemo(() => {
    const map = new Map<string, { name: string; qty: number }>();
    for (const o of orders) {
      for (const l of o.lines) {
        const entry = map.get(l.itemId) ?? { name: l.itemName, qty: 0 };
        entry.qty += l.quantity;
        map.set(l.itemId, entry);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [orders]);

  const byBuilding = useMemo(() => {
    const map = new Map<Building, number>();
    for (const b of BUILDING_ORDER) map.set(b, 0);
    for (const o of orders) map.set(o.building, (map.get(o.building) ?? 0) + o.totalQuantity);
    return BUILDING_ORDER.map((b) => ({
      name: b,
      label: BUILDING_LABELS[b],
      value: map.get(b) ?? 0,
      color: BUILDING_COLORS[b],
    }));
  }, [orders]);

  const byGrade = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) map.set(o.grade, (map.get(o.grade) ?? 0) + o.totalQuantity);
    const order = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
    return order
      .filter((g) => map.has(g))
      .map((g) => ({ grade: g, items: map.get(g) ?? 0 }));
  }, [orders]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-4 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-48 rounded-2xl bg-white border border-slate-200 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Items sold" value={stats.totalItems} />
        <Stat label="Students" value={stats.uniqueStudents} />
        <Stat label="Item types" value={stats.uniqueItems} />
      </div>

      <ChartCard title="Items sold by product">
        <ResponsiveContainer width="100%" height={Math.max(180, byItem.length * 36)}>
          <BarChart
            data={byItem}
            layout="vertical"
            margin={{ left: 100, right: 24, top: 4, bottom: 4 }}
          >
            <CartesianGrid stroke="#f1f5f9" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "#475569" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fill: "#475569" }}
              axisLine={false}
              tickLine={false}
              width={96}
            />
            <Tooltip
              cursor={{ fill: "#f8fafc" }}
              contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
            />
            <Bar dataKey="qty" fill="#0f172a" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Items by building">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={byBuilding}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={2}
            >
              {byBuilding.map((b) => (
                <Cell key={b.name} fill={b.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
              formatter={(value, _name, item) => {
                const label = (item?.payload as { label?: string } | undefined)?.label ?? "";
                return [`${value} items`, label];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {byBuilding.map((b) => (
            <div key={b.name} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: b.color }} />
              <span>
                {b.name} · {b.value}
              </span>
            </div>
          ))}
        </div>
      </ChartCard>

      <ChartCard title="Items by grade">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={byGrade} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="grade"
              tick={{ fontSize: 12, fill: "#475569" }}
              axisLine={{ stroke: "#cbd5e1" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#475569" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "#f8fafc" }}
              contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
            />
            <Bar dataKey="items" fill="#0f172a" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-3 shadow-sm">
      <div className="text-2xl sm:text-3xl font-bold tabular-nums leading-none">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mt-1">
        {label}
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900 mb-3">{title}</h2>
      {children}
    </section>
  );
}
