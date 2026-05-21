import {
  buildingForGrade,
  studentKey,
  type Building,
  type ColumnMapping,
  type SheetConfig,
  type StudentOrder,
  type StudentOrderLine,
  type WorksheetSource,
} from "./types";

export type RawRow = (string | number | null | undefined)[];

export interface WorksheetParseResult {
  worksheetId: string;
  parsedRows: ParsedRow[];
  warnings: string[];
  skippedRows: number;
  composedHeaders: string[];
}

export interface ParsedRow {
  firstName: string;
  lastName: string;
  grade: string;
  building: Building;
  notes?: string;
  lines: StudentOrderLine[];
}

export interface FundraiserParseResult {
  orders: StudentOrder[];
  warningsByWorksheet: Record<string, string[]>;
  skippedRowsByWorksheet: Record<string, number>;
  composedHeadersByWorksheet: Record<string, string[]>;
}

const HEADER_SEPARATOR = " — ";

function normalizeHeader(s: unknown): string {
  return String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function composeHeader(rawSheet: RawRow[], headerRowIndex: number, count: number): string[] {
  const rows: RawRow[] = [];
  for (let i = headerRowIndex - count + 1; i <= headerRowIndex; i++) {
    rows.push(rawSheet[i] ?? []);
  }
  const width = Math.max(...rows.map((r) => r.length), 0);
  const out: string[] = [];
  for (let c = 0; c < width; c++) {
    const parts: string[] = [];
    for (const r of rows) {
      const v = String(r[c] ?? "").trim();
      if (v) parts.push(v);
    }
    out.push(parts.join(HEADER_SEPARATOR));
  }
  return out;
}

function findHeaderIndex(headers: string[], columnName: string | undefined): number {
  if (!columnName) return -1;
  const target = normalizeHeader(columnName);
  const exact = headers.findIndex((h) => normalizeHeader(h) === target);
  if (exact >= 0) return exact;
  const sepRe = new RegExp(`[—·:|\\-]\\s*${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
  const suffixMatches = headers
    .map((h, i) => ({ h: normalizeHeader(h), i }))
    .filter((x) => sepRe.test(x.h));
  if (suffixMatches.length === 1) return suffixMatches[0].i;
  return -1;
}

function coerceQuantity(raw: unknown): number {
  if (typeof raw === "number") return Math.max(0, Math.floor(raw));
  if (raw == null) return 0;
  const cleaned = String(raw).replace(/[^0-9.-]/g, "");
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function pickCell(row: RawRow, idx: number): string {
  if (idx < 0 || idx >= row.length) return "";
  return String(row[idx] ?? "").trim();
}

function normalizeBuildingFromCell(cell: string, grade: string): Building {
  const c = cell.trim().toUpperCase();
  if (c === "LE" || c === "UE" || c === "MS" || c === "HS" || c === "STAFF") return c;
  if (c.includes("LOWER")) return "LE";
  if (c.includes("UPPER")) return "UE";
  if (c.includes("MIDDLE")) return "MS";
  if (c.includes("HIGH")) return "HS";
  if (c.includes("STAFF") || c.includes("TEACHER")) return "STAFF";
  return buildingForGrade(grade);
}

/** Strip ordinal suffix from grade strings: "1st" → "1", "K" → "K", "12th" → "12". */
function normalizeGrade(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  if (/^k(indergarten)?$/i.test(s)) return "K";
  const m = s.match(/^(\d{1,2})\s*(st|nd|rd|th)?\b/i);
  if (m) return m[1];
  return s;
}

/** Split "Last, First" → [first, last]. Split "Jude Stender" → ["Jude", "Stender"].
 *  Multi-word names like "Jose Manuel Diaz" → ["Jose Manuel", "Diaz"] (last
 *  word is the surname). */
function splitFullName(raw: string): { firstName: string; lastName: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  if (trimmed.includes(",")) {
    const [last, first] = trimmed.split(",", 2);
    return { firstName: first.trim(), lastName: last.trim() };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, -1).join(" ");
  return { firstName, lastName };
}

function isTruthyAttribute(raw: unknown): boolean {
  if (raw == null) return false;
  const s = String(raw).trim().toLowerCase();
  if (!s) return false;
  if (s === "0" || s === "false" || s === "no" || s === "n" || s === "-") return false;
  return true;
}

export function parseWorksheet(rawSheet: RawRow[], worksheet: WorksheetSource): WorksheetParseResult {
  const warnings: string[] = [];
  const {
    headerRow: headerRowNum,
    dataStartRow,
    headerRowsCount,
    columnMapping,
    items,
    gradeOverride,
    buildingOverride,
    deliveryDateOverride,
  } = worksheet;
  const rowCount = headerRowsCount && headerRowsCount > 0 ? headerRowsCount : 1;

  if (headerRowNum < 1 || headerRowNum > rawSheet.length) {
    return {
      worksheetId: worksheet.id,
      parsedRows: [],
      warnings: [`Header row ${headerRowNum} is outside the sheet (${rawSheet.length} rows).`],
      skippedRows: 0,
      composedHeaders: [],
    };
  }

  const headers = composeHeader(rawSheet, headerRowNum - 1, rowCount);

  const baseIdx = {
    firstName: findHeaderIndex(headers, columnMapping.firstName),
    lastName: findHeaderIndex(headers, columnMapping.lastName),
    fullName: findHeaderIndex(headers, columnMapping.fullNameColumn),
    grade: findHeaderIndex(headers, columnMapping.grade),
    building: findHeaderIndex(headers, columnMapping.building),
    notes: findHeaderIndex(headers, columnMapping.notes),
  };

  const usingFullName = baseIdx.fullName >= 0;
  if (!usingFullName) {
    if (baseIdx.firstName < 0)
      warnings.push(`Column "${columnMapping.firstName}" (First Name) not found in header.`);
    if (baseIdx.lastName < 0)
      warnings.push(`Column "${columnMapping.lastName}" (Last Name) not found in header.`);
  }

  const itemIndices = items.map((it) => ({
    item: it,
    qtyIdx: it.quantityColumn ? findHeaderIndex(headers, it.quantityColumn) : -1,
    idIdx: findHeaderIndex(headers, it.identifierColumn),
    attributes: (it.attributes ?? []).map((a) => ({
      def: a,
      idx: findHeaderIndex(headers, a.column),
    })),
  }));
  for (const ii of itemIndices) {
    if (ii.item.quantityColumn && ii.qtyIdx < 0) {
      warnings.push(
        `Item "${ii.item.name}": quantity column "${ii.item.quantityColumn}" not found.`,
      );
    }
    for (const a of ii.attributes) {
      if (a.idx < 0) warnings.push(`Attribute column "${a.def.column}" not found.`);
    }
  }

  const parsedRows: ParsedRow[] = [];
  let skippedRows = 0;

  for (let r = dataStartRow - 1; r < rawSheet.length; r++) {
    const row = rawSheet[r] ?? [];

    let firstName = "";
    let lastName = "";
    if (usingFullName) {
      const split = splitFullName(pickCell(row, baseIdx.fullName));
      firstName = split.firstName;
      lastName = split.lastName;
    } else {
      firstName = pickCell(row, baseIdx.firstName);
      lastName = pickCell(row, baseIdx.lastName);
    }
    if (!firstName || !lastName) continue;

    const lines: StudentOrderLine[] = [];
    for (const ii of itemIndices) {
      // If item has no quantityColumn, treat as qty=1 (one row = one unit).
      // If it has a quantityColumn but the cell is 0/empty, skip this item.
      const qty = ii.item.quantityColumn
        ? coerceQuantity(row[ii.qtyIdx])
        : 1;
      if (qty <= 0) continue;

      const identifier = ii.idIdx >= 0 ? pickCell(row, ii.idIdx) || undefined : undefined;
      const attrs: StudentOrderLine["attributes"] = [];
      for (const a of ii.attributes) {
        if (a.idx < 0) continue;
        const raw = row[a.idx];
        const label = a.def.label ?? a.def.column;
        if (a.def.type === "boolean") {
          if (isTruthyAttribute(raw)) {
            attrs.push({ label, value: String(raw).trim(), type: "boolean" });
          }
        } else {
          const v = pickCell(row, a.idx);
          if (v) attrs.push({ label, value: v, type: "text" });
        }
      }
      lines.push({
        itemId: ii.item.id,
        itemName: ii.item.name,
        quantity: qty,
        identifier,
        deliveryDate: ii.item.deliveryDate ?? deliveryDateOverride,
        attributes: attrs.length > 0 ? attrs : undefined,
      });
    }
    if (lines.length === 0) {
      skippedRows++;
      continue;
    }

    const gradeRaw = gradeOverride ?? pickCell(row, baseIdx.grade);
    const grade = normalizeGrade(gradeRaw);
    const building: Building =
      buildingOverride ??
      (() => {
        const cell = pickCell(row, baseIdx.building);
        return cell ? normalizeBuildingFromCell(cell, grade) : buildingForGrade(grade);
      })();
    const notes = pickCell(row, baseIdx.notes) || undefined;

    parsedRows.push({
      firstName,
      lastName,
      grade,
      building,
      notes,
      lines,
    });
  }

  return { worksheetId: worksheet.id, parsedRows, warnings, skippedRows, composedHeaders: headers };
}

export function parseFundraiser(
  fundraiserId: string,
  rawByWorksheetId: Record<string, RawRow[]>,
  config: SheetConfig,
): FundraiserParseResult {
  const orders = new Map<string, StudentOrder>();
  const warningsByWorksheet: Record<string, string[]> = {};
  const skippedRowsByWorksheet: Record<string, number> = {};
  const composedHeadersByWorksheet: Record<string, string[]> = {};

  for (const ws of config.worksheets) {
    const raw = rawByWorksheetId[ws.id] ?? [];
    const result = parseWorksheet(raw, ws);
    warningsByWorksheet[ws.id] = result.warnings;
    skippedRowsByWorksheet[ws.id] = result.skippedRows;
    composedHeadersByWorksheet[ws.id] = result.composedHeaders;
    for (const pr of result.parsedRows) {
      const key = studentKey(pr.firstName, pr.lastName, pr.grade);
      const existing = orders.get(key);
      if (existing) {
        for (const line of pr.lines) existing.lines.push(line);
        existing.totalQuantity = existing.lines.reduce((s, l) => s + l.quantity, 0);
        if (pr.notes && !existing.notes) existing.notes = pr.notes;
      } else {
        orders.set(key, {
          id: `${fundraiserId}:${key}`,
          fundraiserId,
          firstName: pr.firstName,
          lastName: pr.lastName,
          grade: pr.grade,
          building: pr.building,
          lines: [...pr.lines],
          notes: pr.notes,
          totalQuantity: pr.lines.reduce((s, l) => s + l.quantity, 0),
        });
      }
    }
  }

  return {
    orders: Array.from(orders.values()),
    warningsByWorksheet,
    skippedRowsByWorksheet,
    composedHeadersByWorksheet,
  };
}

export function buildSampleSheetFromOrders(
  orders: StudentOrder[],
  worksheet: WorksheetSource,
): RawRow[] {
  const mapping: ColumnMapping = worksheet.columnMapping;
  const headers: string[] = [];
  const pushHeader = (label: string | undefined) => {
    if (label && !headers.includes(label)) headers.push(label);
  };
  pushHeader(mapping.lastName);
  pushHeader(mapping.firstName);
  pushHeader(mapping.grade);
  pushHeader(mapping.building);
  for (const it of worksheet.items) pushHeader(it.quantityColumn);
  for (const it of worksheet.items) pushHeader(it.identifierColumn);
  pushHeader(mapping.notes);

  const rows: RawRow[] = [headers];
  for (const o of orders.slice(0, 3)) {
    const row: RawRow = [];
    for (const h of headers) {
      if (h === mapping.lastName) row.push(o.lastName);
      else if (h === mapping.firstName) row.push(o.firstName);
      else if (h === mapping.grade) row.push(o.grade);
      else if (h === mapping.notes) row.push(o.notes ?? "");
      else {
        const itemForQty = worksheet.items.find((it) => it.quantityColumn === h);
        const itemForId = worksheet.items.find((it) => it.identifierColumn === h);
        if (itemForQty) {
          const ln = o.lines.find((l) => l.itemId === itemForQty.id);
          row.push(ln?.quantity ?? "");
        } else if (itemForId) {
          const ln = o.lines.find((l) => l.itemId === itemForId.id);
          row.push(ln?.identifier ?? "");
        } else {
          row.push("");
        }
      }
    }
    rows.push(row);
  }
  return rows;
}
