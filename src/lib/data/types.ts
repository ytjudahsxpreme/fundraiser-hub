export type Building = "LE" | "UE" | "MS" | "HS";

export const BUILDING_LABELS: Record<Building, string> = {
  LE: "Lower Elementary",
  UE: "Upper Elementary",
  MS: "Middle School",
  HS: "High School",
};

export const BUILDING_ORDER: Building[] = ["LE", "UE", "MS", "HS"];

export const GRADES_BY_BUILDING: Record<Building, string[]> = {
  LE: ["K", "1", "2"],
  UE: ["3", "4", "5"],
  MS: ["6", "7", "8"],
  HS: ["9", "10", "11", "12"],
};

export const ALL_GRADES: string[] = BUILDING_ORDER.flatMap((b) => GRADES_BY_BUILDING[b]);

export function buildingForGrade(grade: string): Building {
  for (const b of BUILDING_ORDER) {
    if (GRADES_BY_BUILDING[b].includes(grade)) return b;
  }
  return "HS";
}

/**
 * A single item the fundraiser sells. A fundraiser usually has more than one
 * (pizza + chips + juice; empanada flavors; sub + numbered ticket; ice cream
 * flavors; etc.). identifierColumn is optional — used for things like Subway
 * order numbers where each unit has a tag the student needs.
 */
export interface FundraiserItem {
  id: string;
  name: string;
  quantityColumn: string;
  identifierColumn?: string;
}

/**
 * One worksheet/tab in a Google Sheet. A fundraiser can pull from many tabs.
 * Each tab has its own header offsets, column mapping, and item list because
 * different tabs are often shaped differently (different forms, different days).
 */
export interface WorksheetSource {
  id: string;
  name: string;
  headerRow: number;
  dataStartRow: number;
  columnMapping: ColumnMapping;
  items: FundraiserItem[];
}

/**
 * Per-worksheet column mapping — only the columns common to every row.
 * Item quantity columns live on FundraiserItem so we can have any number of them.
 */
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
  accessCode: string;
  color: string;
  emoji: string;
  sheetConfig: SheetConfig;
}

/**
 * One item a student ordered. A student usually has multiple of these.
 */
export interface StudentOrderLine {
  itemId: string;
  itemName: string;
  quantity: number;
  identifier?: string;
}

/**
 * A student's complete order in a fundraiser — aggregated across all worksheets.
 * If "John Smith / Grade 7" appears in both the Lower School tab and the Upper
 * School tab, those lines merge into one StudentOrder.
 */
export interface StudentOrder {
  id: string;
  fundraiserId: string;
  firstName: string;
  lastName: string;
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
}

export const EMPTY_FILTERS: LookupFilters = {
  query: "",
  grade: null,
  building: null,
  itemId: null,
};

export const MASTER_ACCESS_CODE = "admin-2026";

export function studentKey(firstName: string, lastName: string, grade: string): string {
  return `${firstName.trim().toLowerCase()}|${lastName.trim().toLowerCase()}|${grade.trim().toLowerCase()}`;
}
