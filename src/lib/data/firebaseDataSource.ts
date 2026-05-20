import "server-only";
import { getDb } from "../firebase/admin";
import { fetchManyWorksheets } from "../sheets/client";
import { parseFundraiser, type RawRow } from "./parser";
import type {
  Fundraiser,
  SheetConfig,
  StudentOrder,
} from "./types";
import type { DataSource, FundraiserPatch } from "./dataSource";

const COLLECTION = "fundraisers";

function docToFundraiser(id: string, data: FirebaseFirestore.DocumentData | undefined): Fundraiser | null {
  if (!data) return null;
  return {
    id,
    name: data.name,
    classYear: data.classYear,
    accessCode: data.accessCode,
    color: data.color,
    emoji: data.emoji,
    sheetConfig: data.sheetConfig as SheetConfig,
  };
}

export const firebaseDataSource: DataSource = {
  async listFundraisers() {
    const db = getDb();
    const snap = await db.collection(COLLECTION).get();
    return snap.docs
      .map((d) => docToFundraiser(d.id, d.data()))
      .filter((f): f is Fundraiser => f !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async getFundraiser(id) {
    const db = getDb();
    const snap = await db.collection(COLLECTION).doc(id).get();
    return docToFundraiser(snap.id, snap.data());
  },

  async listOrders(fundraiserId) {
    const fundraiser = await firebaseDataSource.getFundraiser(fundraiserId);
    if (!fundraiser) return [];
    const { sheetConfig } = fundraiser;
    if (!sheetConfig.sheetUrl || sheetConfig.worksheets.length === 0) return [];

    const worksheetNames = sheetConfig.worksheets.map((w) => w.name);
    const rawByName = await fetchManyWorksheets(sheetConfig.sheetUrl, worksheetNames);

    // parseFundraiser keys rows by worksheet.id; map sheet-tab-name back to id.
    const rawById: Record<string, RawRow[]> = {};
    for (const ws of sheetConfig.worksheets) {
      rawById[ws.id] = rawByName[ws.name] ?? [];
    }

    const result = parseFundraiser(fundraiserId, rawById, sheetConfig);
    return result.orders;
  },

  async updateFundraiser(id, patch: FundraiserPatch) {
    const db = getDb();
    const ref = db.collection(COLLECTION).doc(id);
    const update: Record<string, unknown> = {};
    if (patch.accessCode !== undefined) update.accessCode = patch.accessCode;
    if (patch.sheetConfig !== undefined) update.sheetConfig = patch.sheetConfig;
    await ref.set(update, { merge: true });
    const fresh = await ref.get();
    const out = docToFundraiser(fresh.id, fresh.data());
    if (!out) throw new Error(`Fundraiser ${id} not found after update`);
    return out;
  },
};

/**
 * Server-side verification of an access code. Returns true if the supplied code
 * matches the fundraiser's code OR the master code. The code never leaves the
 * server with this design.
 */
export async function verifyAccessCode(
  fundraiserId: string,
  code: string,
  masterCode: string,
): Promise<boolean> {
  const trimmed = code.trim();
  if (!trimmed) return false;
  if (trimmed === masterCode) return true;
  const fundraiser = await firebaseDataSource.getFundraiser(fundraiserId);
  if (!fundraiser) return false;
  return trimmed === fundraiser.accessCode;
}

/**
 * Bulk upsert (used by the seed script).
 */
export async function seedFundraisers(fundraisers: Fundraiser[]): Promise<void> {
  const db = getDb();
  const batch = db.batch();
  for (const f of fundraisers) {
    const ref = db.collection(COLLECTION).doc(f.id);
    const { id: _omit, ...rest } = f;
    void _omit;
    batch.set(ref, rest, { merge: false });
  }
  await batch.commit();
}
