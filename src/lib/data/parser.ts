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
}

function normalizeHeader(s: unknown): string {
  return String(s ?? "").trim().toLowerCase();
}

function findHeaderIndex(headerRow: RawRow, columnName: string | undefined): number {
  if (!columnName) return -1;
  const target = normalizeHeader(columnName);
  return headerRow.findIndex((h) => normalizeHeader(h) === target);
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
  if (c === "LE" || c === "UE" || c === "MS" || c === "HS") return c;
  if (c.includes("LOWER")) return "LE";
  if (c.includes("UPPER")) return "UE";
  if (c.includes("MIDDLE")) return "MS";
  if (c.includes("HIGH")) return "HS";
  return buildingForGrade(grade);
}

export function parseWorksheet(rawSheet: RawRow[], worksheet: WorksheetSource): WorksheetParseResult {
  const warnings: string[] = [];
  const { headerRow: headerRowNum, dataStartRow, columnMapping, items } = worksheet;

  if (headerRowNum < 1 || headerRowNum > rawSheet.length) {
    return {
      worksheetId: worksheet.id,
      parsedRows: [],
      warnings: [`Header row ${headerRowNum} is outside the sheet (${rawSheet.length} rows).`],
      skippedRows: 0,
    };
  }

  const headerRow = rawSheet[headerRowNum - 1] ?? [];
  const baseIdx = {
    firstName: findHeaderIndex(headerRow, columnMapping.firstName),
    lastName: findHeaderIndex(headerRow, columnMapping.lastName),
    grade: findHeaderIndex(headerRow, columnMapping.grade),
    building: findHeaderIndex(headerRow, columnMapping.building),
    notes: findHeaderIndex(headerRow, columnMapping.notes),
  };

  if (baseIdx.firstName < 0)
    warnings.push(`Column "${columnMapping.firstName}" (First Name) not found in header.`);
  if (baseIdx.lastName < 0)
    warnings.push(`Column "${columnMapping.lastName}" (Last Name) not found in header.`);

  const itemIndices = items.map((it) => ({
    item: it,
    qtyIdx: findHeaderIndex(headerRow, it.quantityColumn),
    idIdx: findHeaderIndex(headerRow, it.identifierColumn),
  }));
  for (const ii of itemIndices) {
    if (ii.qtyIdx < 0) {
      warnings.push(
        `Item "${ii.item.name}": quantity column "${ii.item.quantityColumn}" not found.`,
      );
    }
  }

  const parsedRows: ParsedRow[] = [];
  let skippedRows = 0;

  for (let r = dataStartRow - 1; r < rawSheet.length; r++) {
    const row = rawSheet[r] ?? [];
    const firstName = pickCell(row, baseIdx.firstName);
    const lastName = pickCell(row, baseIdx.lastName);
    if (!firstName && !lastName) continue;

    const lines: StudentOrderLine[] = [];
    for (const ii of itemIndices) {
      const qty = coerceQuantity(row[ii.qtyIdx]);
      if (qty <= 0) continue;
      const identifier = ii.idIdx >= 0 ? pickCell(row, ii.idIdx) || undefined : undefined;
      lines.push({
        itemId: ii.item.id,
        itemName: ii.item.name,
        quantity: qty,
        identifier,
      });
    }
    if (lines.length === 0) {
      skippedRows++;
      continue;
    }

    const grade = pickCell(row, baseIdx.grade) || "?";
    const buildingCell = pickCell(row, baseIdx.building);
    const building = buildingCell ? normalizeBuildingFromCell(buildingCell, grade) : buildingForGrade(grade);
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

  return { worksheetId: worksheet.id, parsedRows, warnings, skippedRows };
}

/**
 * Run parseWorksheet on each worksheet and merge the results into one
 * StudentOrder per (firstName, lastName, grade). A student appearing in
 * multiple tabs has all their lines combined.
 */
export function parseFundraiser(
  fundraiserId: string,
  rawByWorksheetId: Record<string, RawRow[]>,
  config: SheetConfig,
): FundraiserParseResult {
  const orders = new Map<string, StudentOrder>();
  const warningsByWorksheet: Record<string, string[]> = {};
  const skippedRowsByWorksheet: Record<string, number> = {};

  for (const ws of config.worksheets) {
    const raw = rawByWorksheetId[ws.id] ?? [];
    const result = parseWorksheet(raw, ws);
    warningsByWorksheet[ws.id] = result.warnings;
    skippedRowsByWorksheet[ws.id] = result.skippedRows;
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
