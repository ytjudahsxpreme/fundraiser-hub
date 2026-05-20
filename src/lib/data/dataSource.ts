import { clientDataSource } from "./clientDataSource";
import { mockClientDataSource } from "./mockClientDataSource";
import type { Fundraiser, SheetConfig, StudentOrder } from "./types";

/**
 * The DataSource interface is the swap point between the API-fetching client
 * and a local mock. The UI only ever sees this interface.
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

/**
 * Default: real backend (calls /api/* routes, which use Firestore + Sheets).
 * Set NEXT_PUBLIC_USE_MOCK_DATA=1 in .env.local to run the UI against the
 * local mock without a Firebase project.
 */
const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "1";

export const dataSource: DataSource = useMock ? mockClientDataSource : clientDataSource;
