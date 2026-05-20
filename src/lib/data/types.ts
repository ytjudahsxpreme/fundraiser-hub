export type Building = "LE" | "UE" | "MS" | "HS" | "STAFF";

export const BUILDING_LABELS: Record<Building, string> = {
  LE: "Lower Elementary",
  UE: "Upper Elementary",
  MS: "Middle School",
  HS: "High School",
  STAFF: "Teachers / Staff",
};

export const BUILDING_ORDER: Building[] = ["LE", "UE", "MS", "HS", "STAFF"];

export const GRADES_BY_BUILDING: Record<Building, string[]> = {
  LE: ["K", "1", "2"],
  UE: ["3", "4", "5"],
  MS: ["6", "7", "8"],
  HS: ["9", "10", "11", "12"],
  STAFF: [],
};

export const ALL_GRADES: string[] = BUILDING_ORDER.flatMap((b) => GRADES_BY_BUILDING[b]);

export function buildingForGrade(grade: string): Building {
  for (const b of BUILDING_ORDER) {
    if (GRADES_BY_BUILDING[b].includes(grade)) return b;
  }
  return "HS";
}

/**
 * One item the fundraiser sells. A fundraiser usually has several
 * (pizza + chips + juice; empanada flavors; sub + numbered ticket; etc.).
 * deliveryDate, when set, lets the lookup UI offer a per-delivery-date view
 * (so distribution day shows only that day's items).
 */
export interface FundraiserItem {
  id: string;
  name: string;
  quantityColumn: string;
  identifierColumn?: string;
  /** ISO date (YYYY-MM-DD) or short label ("MAY 6"). Optional. */
  deliveryDate?: string;
}

/**
 * One worksheet/tab in a Google Sheet. A fundraiser can pull from many tabs.
 * gradeOverride / buildingOverride are used when the tab IS the grade (e.g.
 * a sheet with one tab per grade, no grade column in the data).
 * headerRowsCount lets the parser combine multiple rows into a composite
 * header — useful for sheets where row 1 has product names and row 2 has dates.
 */
export interface WorksheetSource {
  id: string;
  name: string;
  headerRow: number;
  dataStartRow: number;
  /** Number of rows to merge into the header lookup. Default 1. */
  headerRowsCount?: number;
  /** If set, every row in this tab gets this grade (no grade column needed). */
  gradeOverride?: string;
  /** If set, every row in this tab gets this building (no building column needed). */
  buildingOverride?: Building;
  columnMapping: ColumnMapping;
  items: FundraiserItem[];
}

/** Per-worksheet column mapping — only columns common to every row. */
export interface ColumnMapping {
  firstName: string;
  lastName: string;
  grade?: string;
  building?: string;
  notes?: string;
}

export interface SheetConfig {
  sheetUrl: string;
  worksheets: WorksheetSource[];
}

export interface Fundraiser {
  id: string;
  name: string;
  classYear: string;
  /**
   * Omitted on responses from public endpoints (e.g. the home-page list).
   * Present after unlock or in server-side calls.
   */
  accessCode?: string;
  color: string;
  emoji: string;
  sheetConfig: SheetConfig;
}

export interface StudentOrderLine {
  itemId: string;
  itemName: string;
  quantity: number;
  identifier?: string;
  /** Copied from FundraiserItem.deliveryDate so the UI can group/filter by date. */
  deliveryDate?: string;
}

export interface StudentOrder {
  id: string;
  fundraiserId: string;
  firstName: string;
  lastName: string;
  /** May be empty for staff rows. */
  grade: string;
  building: Building;
  lines: StudentOrderLine[];
  notes?: string;
  totalQuantity: number;
}

export interface LookupFilters {
  query: string;
  grade: string | null;
  building: Building | null;
  itemId: string | null;
  /** When set, only lines matching this deliveryDate appear in cards / counts. */
  deliveryDate: string | null;
}

export const EMPTY_FILTERS: LookupFilters = {
  query: "",
  grade: null,
  building: null,
  itemId: null,
  deliveryDate: null,
};

export function studentKey(firstName: string, lastName: string, grade: string): string {
  return `${firstName.trim().toLowerCase()}|${lastName.trim().toLowerCase()}|${grade.trim().toLowerCase()}`;
}
