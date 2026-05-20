import type { LookupFilters, StudentOrder } from "../data/types";

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

export function matchesQuery(order: StudentOrder, query: string): boolean {
  if (!query) return true;
  const q = normalize(query);
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = `${order.firstName} ${order.lastName}`.toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}

export function applyFilters(orders: StudentOrder[], filters: LookupFilters): StudentOrder[] {
  return orders.filter((o) => {
    if (!matchesQuery(o, filters.query)) return false;
    if (filters.grade && o.grade !== filters.grade) return false;
    if (filters.building && o.building !== filters.building) return false;
    if (filters.itemId && !o.lines.some((l) => l.itemId === filters.itemId)) return false;
    return true;
  });
}

export function sortByName(orders: StudentOrder[]): StudentOrder[] {
  return [...orders].sort((a, b) => {
    const aN = `${a.lastName} ${a.firstName}`.toLowerCase();
    const bN = `${b.lastName} ${b.firstName}`.toLowerCase();
    return aN < bN ? -1 : aN > bN ? 1 : 0;
  });
}
