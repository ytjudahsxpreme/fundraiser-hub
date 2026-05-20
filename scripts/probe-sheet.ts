/**
 * Quick diagnostic: list the tabs of a sheet and print the first few rows
 * of each. Helps figure out what headerRow + dataStartRow + columnMapping
 * should be for a real fundraiser sheet.
 *
 * Usage:  npm run probe -- juniors-pizza
 */
import { readFileSync } from "node:fs";
import { google } from "googleapis";
import { JWT } from "google-auth-library";

const TARGETS: Record<string, string | undefined> = {
  "juniors-pizza": process.env.SHEET_URL_JUNIORS_PIZZA,
  "seniors-empanadas": process.env.SHEET_URL_SENIORS_EMPANADAS,
  "sophomores-subway": process.env.SHEET_URL_SOPHOMORES_SUBWAY,
  "freshmen-icecream": process.env.SHEET_URL_FRESHMEN_ICECREAM,
};

function loadKey() {
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!path) throw new Error("GOOGLE_APPLICATION_CREDENTIALS not set");
  return JSON.parse(readFileSync(path, "utf8"));
}

function extractSheetId(url: string): string {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : url;
}

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("usage: tsx scripts/probe-sheet.ts <fundraiserId>");
    console.error("available:", Object.keys(TARGETS).join(", "));
    process.exit(1);
  }
  const url = TARGETS[id];
  if (!url) {
    console.error(`No sheet URL configured for "${id}"`);
    process.exit(1);
  }
  const key = loadKey();
  const auth = new JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = extractSheetId(url);

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const tabs = meta.data.sheets ?? [];
  console.log(`\nSpreadsheet: ${meta.data.properties?.title} (${spreadsheetId})`);
  console.log(`Tabs (${tabs.length}):`);
  for (const t of tabs) console.log(`  • ${t.properties?.title}`);

  for (const t of tabs) {
    const tab = t.properties?.title;
    if (!tab) continue;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tab}!A1:Z10`,
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    const rows = res.data.values ?? [];
    console.log(`\n── Tab "${tab}" — first ${Math.min(rows.length, 10)} rows ──`);
    rows.forEach((row, i) => {
      console.log(`  row ${i + 1}: ${JSON.stringify(row)}`);
    });
  }
}

main().catch((err) => {
  console.error("Probe failed:", err.message ?? err);
  process.exit(1);
});
