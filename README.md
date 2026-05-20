# Fundraiser Hub

Mobile-first internal web app that replaces paper student-lookup lists during school fundraiser distribution.

The whole platform exists to answer one question fast:

> *"Which items does this student get?"*

## Stack

- Next.js 16 (App Router) + React 19
- TypeScript (strict)
- Tailwind CSS v4
- Zustand for client state (persisted unlock state)
- Recharts for the dashboard
- Papaparse for CSV export

Data is fully mocked today (`src/lib/data/mockData.ts`). The whole app talks to a single `DataSource` interface — swap that file for a Firebase + Google Sheets implementation when ready (see [Wiring real data](#wiring-real-data) below).

## Running locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

The seeded mock fundraisers and their access codes:

| Fundraiser | Code |
|---|---|
| Junior Pizza | `pizza2026` |
| Senior Empanada | `empanada2026` |
| Sophomore Subway | `subway2026` |
| Freshmen Ice Cream | `icecream2026` |
| **Master / Admin** | `admin-2026` |

These are defined in `src/lib/data/mockData.ts` and can be overridden per-fundraiser on the **Settings** page (saved to `localStorage` until real persistence lands).

## App structure

```
src/
  app/
    page.tsx                  ← fundraiser picker + access code gate
    f/[id]/
      layout.tsx              ← top bar + bottom nav + unlock check
      lookup/page.tsx         ← CORE: search + filters + result cards
      dashboard/page.tsx      ← charts (Recharts)
      reports/page.tsx        ← grouped report views + CSV export + print
      settings/page.tsx       ← access code + sheet config + column mapping
  components/                 ← shared UI
  lib/
    data/
      types.ts                ← StudentOrder, Fundraiser, SheetConfig, ColumnMapping
      mockData.ts             ← seeded mock fundraisers + ~400 orders total
      parser.ts               ← raw sheet rows + config → StudentOrder[]
      dataSource.ts           ← the swap point for real data
    state/appState.ts         ← Zustand: which fundraisers are unlocked
    utils/                    ← search, classnames
```

## Wiring real data

The mock layer is deliberately thin so the swap is mostly a one-file change:

### 1. Add a Firestore-backed `DataSource`

Create `src/lib/data/firebaseDataSource.ts` that implements the `DataSource` interface from [`dataSource.ts`](src/lib/data/dataSource.ts:1):

```ts
export const firebaseDataSource: DataSource = {
  async listFundraisers() { /* read from /fundraisers */ },
  async getFundraiser(id) { /* read /fundraisers/{id} */ },
  async listOrders(fundraiserId) { /* read /fundraisers/{id}/orders */ },
  async updateFundraiser(id, patch) { /* write /fundraisers/{id} */ },
};
```

Then change the final line of `dataSource.ts` from:

```ts
export const dataSource: DataSource = mockDataSource;
```

to:

```ts
export const dataSource: DataSource = firebaseDataSource;
```

Nothing else in the app changes.

### 2. Add Google Sheets fetcher (server-side)

Sheets are read-only, refreshed on a schedule:

1. Create a Google Cloud project, enable the Sheets API.
2. Create a Service Account, download the JSON key.
3. Share each fundraiser sheet with the service account's email (Viewer is enough).
4. Store the credentials as an env var:

   ```bash
   GOOGLE_SERVICE_ACCOUNT_JSON='{ "type": "service_account", ... }'
   ```

5. Add `src/app/api/sync/[id]/route.ts` (Next.js API route) that:
   - Loads the fundraiser's `sheetConfig` from Firestore.
   - Fetches the raw sheet via `googleapis`.
   - Runs the rows through [`parseSheet`](src/lib/data/parser.ts:1) — this part already works.
   - Writes the resulting `StudentOrder[]` to Firestore.

6. Trigger the sync every 15–30s from a Firebase Function on a schedule, or fetch-on-load on the client.

The parser is the load-bearing piece and is already done — it handles header-row offsets, missing columns, type coercion, and inconsistent building values.

### 3. Move access codes to Firestore

Today access codes live in `mockData.ts` / `localStorage`. Move them to a `/fundraisers/{id}` Firestore doc and have the unlock action call a `verifyAccessCode` Cloud Function so the code never ships to the browser. The `useAppState` store stays unchanged.

## Mobile-first notes

- Bottom tab nav, 64px touch targets.
- 16px form inputs to prevent iOS auto-zoom.
- `pb-24` on every main scroll region clears the bottom nav.
- `print:hidden` hides controls on the Reports page when printing pickup lists.
- Filters live in a sticky band so search/filter state stays reachable while scrolling.

## What's intentionally not built

These are listed in the original spec as **not needed** — and they aren't:

- Ecommerce / payments
- Parent or student accounts
- Push notifications, messaging
- Direct sheet editing
- Offline mode (yet)

## Roadmap shorthand

| Phase | Status |
|---|---|
| 1. Google Sheets integration | mock → real |
| 2. Mapping engine | ✅ |
| 3. Lookup | ✅ |
| 4. Dashboard | ✅ |
| 5. Reports + export | ✅ |
| 6. Mobile polish | ✅ |
