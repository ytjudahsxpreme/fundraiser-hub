import "server-only";
import { google, type sheets_v4 } from "googleapis";
import { JWT } from "google-auth-library";
import { getServiceAccountKey } from "../firebase/admin";

let cachedClient: sheets_v4.Sheets | undefined;

function makeClient(): sheets_v4.Sheets {
  const key = getServiceAccountKey();
  const auth = new JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}

function getClient(): sheets_v4.Sheets {
  if (cachedClient) return cachedClient;
  cachedClient = makeClient();
  return cachedClient;
}

/**
 * Extract the spreadsheet ID from a Google Sheets URL like
 *   https://docs.google.com/spreadsheets/d/<ID>/edit#gid=0
 * Falls back to returning the input unchanged if it already looks like a bare ID.
 */
export function extractSheetId(sheetUrl: string): string {
  const m = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  return sheetUrl;
}

export type RawRow = (string | number | null | undefined)[];

/**
 * Fetch every row of a worksheet (tab) as a 2D array. Empty trailing cells
 * are not padded by Sheets, so callers must tolerate variable-length rows
 * (the parser already does).
 */
export async function fetchWorksheet(
  spreadsheetUrl: string,
  worksheetName: string,
): Promise<RawRow[]> {
  const sheets = getClient();
  const spreadsheetId = extractSheetId(spreadsheetUrl);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: worksheetName,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const values = (res.data.values ?? []) as RawRow[];
  return values;
}

export async function fetchManyWorksheets(
  spreadsheetUrl: string,
  worksheetNames: string[],
): Promise<Record<string, RawRow[]>> {
  if (worksheetNames.length === 0) return {};
  const sheets = getClient();
  const spreadsheetId = extractSheetId(spreadsheetUrl);
  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: worksheetNames,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const out: Record<string, RawRow[]> = {};
  const ranges = res.data.valueRanges ?? [];
  for (let i = 0; i < worksheetNames.length; i++) {
    out[worksheetNames[i]] = (ranges[i]?.values ?? []) as RawRow[];
  }
  return out;
}
