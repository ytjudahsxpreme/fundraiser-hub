import { FundraiserCard } from "@/components/FundraiserCard";
import { MOCK_FUNDRAISERS } from "@/lib/data/mockData";

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col">
      <header className="px-5 pt-8 pb-4 sm:pt-12">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Fundraiser Hub
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">
            Choose a fundraiser
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-md">
            Pick a fundraiser and enter the access code shared by your class advisor to look up
            students and view live stats.
          </p>
        </div>
      </header>
      <main className="flex-1 px-5 pb-12">
        <div className="mx-auto max-w-3xl space-y-3">
          {MOCK_FUNDRAISERS.map((f) => (
            <FundraiserCard key={f.id} fundraiser={f} />
          ))}
        </div>
      </main>
      <footer className="px-5 py-6 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl flex items-center justify-between text-xs text-slate-500">
          <span>Internal use only · School Fundraiser System</span>
          <span className="font-mono">v0.1</span>
        </div>
      </footer>
    </div>
  );
}
