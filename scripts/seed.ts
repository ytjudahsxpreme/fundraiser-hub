/**
 * Seed Firestore with the default fundraisers from src/lib/data/mockData.ts.
 *
 * Run once after setting up Firebase:
 *   npm run seed
 *
 * Requires env vars (read from .env.local automatically):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_SERVICE_ACCOUNT_JSON   (or)   GOOGLE_APPLICATION_CREDENTIALS
 *
 * Re-running this OVERWRITES the existing fundraiser docs. Pass --merge to
 * patch only the keys present in the seed instead of replacing whole docs.
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { MOCK_FUNDRAISERS } from "../src/lib/data/mockData";

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    return JSON.parse(raw) as ServiceAccount;
  }
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
  const app = initializeApp({
    credential: cert(sa),
    projectId,
  });
  const db = getFirestore(app);

  const merge = process.argv.includes("--merge");
  const batch = db.batch();
  for (const f of MOCK_FUNDRAISERS) {
    const { id, ...rest } = f;
    const ref = db.collection("fundraisers").doc(id);
    batch.set(ref, rest, { merge });
  }
  await batch.commit();
  console.log(
    `✓ Seeded ${MOCK_FUNDRAISERS.length} fundraisers into Firestore project ${projectId}` +
      (merge ? " (merge mode — existing keys preserved)" : " (overwrite mode)"),
  );
  console.log("\nFundraisers:");
  for (const f of MOCK_FUNDRAISERS) {
    console.log(`  • ${f.id}   ${f.name}   code: ${f.accessCode}`);
  }
  console.log("\nNext: edit each fundraiser's sheet URL and column mapping on the Settings page,");
  console.log("or directly in Firestore at /fundraisers/<id>.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
