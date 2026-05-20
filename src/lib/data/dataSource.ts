import { MOCK_FUNDRAISERS, MOCK_ORDERS } from "./mockData";
import type { Fundraiser, SheetConfig, StudentOrder } from "./types";

/**
 * DataSource abstracts where fundraiser + order data comes from.
 * Today it returns mock data. A Firebase/Sheets-backed implementation will
 * satisfy the same interface — swap the bottom export and nothing else
 * changes in the app.
 */
export interface DataSource {
  listFundraisers(): Promise<Fundraiser[]>;
  getFundraiser(id: string): Promise<Fundraiser | null>;
  listOrders(fundraiserId: string): Promise<StudentOrder[]>;
  updateFundraiser(id: string, patch: FundraiserPatch): Promise<Fundraiser>;
}

export interface FundraiserPatch {
  accessCode?: string;
  sheetConfig?: SheetConfig;
}

const LS_OVERRIDES_KEY = "fundraiser-app:fundraiser-overrides:v2";

interface StoredOverride {
  accessCode?: string;
  sheetConfig?: SheetConfig;
}

function loadOverrides(): Record<string, StoredOverride> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(LS_OVERRIDES_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveOverrides(overrides: Record<string, StoredOverride>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_OVERRIDES_KEY, JSON.stringify(overrides));
}

function applyOverride(f: Fundraiser, overrides: Record<string, StoredOverride>): Fundraiser {
  const o = overrides[f.id];
  if (!o) return f;
  return {
    ...f,
    accessCode: o.accessCode ?? f.accessCode,
    sheetConfig: o.sheetConfig ?? f.sheetConfig,
  };
}

export const mockDataSource: DataSource = {
  async listFundraisers() {
    const overrides = loadOverrides();
    return MOCK_FUNDRAISERS.map((f) => applyOverride(f, overrides));
  },
  async getFundraiser(id) {
    const overrides = loadOverrides();
    const found = MOCK_FUNDRAISERS.find((f) => f.id === id);
    return found ? applyOverride(found, overrides) : null;
  },
  async listOrders(fundraiserId) {
    return MOCK_ORDERS.filter((o) => o.fundraiserId === fundraiserId);
  },
  async updateFundraiser(id, patch) {
    const overrides = loadOverrides();
    const existing: StoredOverride = overrides[id] ?? {};
    overrides[id] = {
      accessCode: patch.accessCode ?? existing.accessCode,
      sheetConfig: patch.sheetConfig ?? existing.sheetConfig,
    };
    saveOverrides(overrides);
    const updated = await this.getFundraiser(id);
    if (!updated) throw new Error(`Fundraiser ${id} not found`);
    return updated;
  },
};

export const dataSource: DataSource = mockDataSource;
