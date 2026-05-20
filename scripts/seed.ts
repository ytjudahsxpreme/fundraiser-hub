/**
 * Seed Firestore with the configured fundraisers.
 *
 * Run once after setting up Firebase, or any time you change the real-sheet
 * shape in scripts/realConfigs.ts:
 *
 *   npm run seed
 *
 * Required env vars (read from .env.local automatically):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_SERVICE_ACCOUNT_JSON  (or)  GOOGLE_APPLICATION_CREDENTIALS
 *
 * Optional sheet URL overrides (per fundraiser):
 *   SHEET_URL_JUNIORS_PIZZA
 *   SHEET_URL_SENIORS_EMPANADAS
 *   SHEET_URL_SOPHOMORES_SUBWAY
 *   SHEET_URL_FRESHMEN_ICECREAM
 *
 * Re-running OVERWRITES existing fundraiser docs. Pass --merge to patch
 * instead.
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { buildRealFundraisers } from "./realConfigs";

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) return JSON.parse(raw) as ServiceAccount;
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!path) {
    throw new Error(
      "Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS in .env.local",
    );
  }
  return JSON.parse(readFileSync(path, "utf8")) as ServiceAccount;
}

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID env var is required");

  const sa = loadServiceAccount();
  const app = initializeApp({ credential: cert(sa), projectId });
  const db = getFirestore(app);

  const fundraisers = buildRealFundraisers({
    pizzaSheetUrl: process.env.SHEET_URL_JUNIORS_PIZZA,
    empanadasSheetUrl: process.env.SHEET_URL_SENIORS_EMPANADAS,
    subwaySheetUrl: process.env.SHEET_URL_SOPHOMORES_SUBWAY,
    icecreamSheetUrl: process.env.SHEET_URL_FRESHMEN_ICECREAM,
  });

  const merge = process.argv.includes("--merge");
  const batch = db.batch();
  for (const f of fundraisers) {
    const { id, ...rest } = f;
    batch.set(db.collection("fundraisers").doc(id), rest, { merge });
  }
  await batch.commit();

  console.log(
    `✓ Seeded ${fundraisers.length} fundraisers into Firestore project ${projectId}` +
      (merge ? " (merge mode)" : " (overwrite mode)"),
  );
  console.log("\nFundraisers:");
  for (const f of fundraisers) {
    const totalItems = f.sheetConfig.worksheets.reduce((s, w) => s + w.items.length, 0);
    const tabCount = f.sheetConfig.worksheets.length;
    const url = f.sheetConfig.sheetUrl || "(no sheet URL — set via Settings)";
    console.log(`  • ${f.id}`);
    console.log(`      ${f.name}    code: ${f.accessCode}`);
    console.log(`      ${tabCount} tabs · ${totalItems} item-column mappings`);
    console.log(`      ${url}`);
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
