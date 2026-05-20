import type { StudentOrder } from "@/lib/data/types";

export function StudentCard({ order }: { order: StudentOrder }) {
  const isStaff = order.building === "STAFF";
  return (
    <article className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <header className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <h3 className="text-lg sm:text-xl font-semibold leading-tight">
            {order.firstName} {order.lastName}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
            {isStaff ? (
              <span className="inline-flex items-center rounded-md bg-violet-100 text-violet-800 text-[11px] font-semibold uppercase tracking-wide px-1.5 py-0.5">
                Teacher / Staff
              </span>
            ) : (
              <>
                {order.grade && (
                  <span>
                    Grade <span className="font-medium text-slate-900">{order.grade}</span>
                  </span>
                )}
                {order.grade && order.building && <span className="text-slate-300">•</span>}
                <span>
                  <span className="font-medium text-slate-900">{order.building}</span>
                </span>
              </>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-3xl sm:text-4xl font-bold tabular-nums leading-none text-slate-900">
            {order.totalQuantity}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-500 font-medium">
            {order.totalQuantity === 1 ? "Item" : "Items"} total
          </div>
        </div>
      </header>

      <ul className="border-t border-slate-100 divide-y divide-slate-100 bg-slate-50/40">
        {order.lines.map((line, i) => (
          <li
            key={`${line.itemId}-${i}`}
            className="flex items-center gap-3 px-4 sm:px-5 py-2.5 text-sm"
          >
            <span className="flex-1 min-w-0">
              <span className="font-semibold text-slate-900">{line.itemName}</span>
              {line.identifier && (
                <span className="ml-2 inline-flex items-center rounded-md bg-slate-900/90 text-white text-[11px] font-mono px-1.5 py-0.5 tabular-nums">
                  {line.identifier}
                </span>
              )}
            </span>
            <span className="text-base font-semibold tabular-nums text-slate-900">
              ×{line.quantity}
            </span>
          </li>
        ))}
      </ul>

      {order.notes && (
        <div className="px-4 sm:px-5 py-3 bg-amber-50/60 border-t border-amber-100">
          <p className="text-sm text-amber-900 flex items-start gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            </svg>
            <span>{order.notes}</span>
          </p>
        </div>
      )}
    </article>
  );
}
