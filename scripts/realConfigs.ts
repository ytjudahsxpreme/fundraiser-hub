/**
 * Programmatic configuration for the real K-12 fundraiser sheets we saw in
 * the field. Used by the seed script; kept separate so mockData stays as a
 * standalone reference shape.
 */
import {
  buildingForGrade,
  type Building,
  type Fundraiser,
  type FundraiserItem,
  type WorksheetSource,
} from "../src/lib/data/types";

interface GradeTab {
  tab: string;
  id: string;
  grade: string;
  building: Building;
}

const STUDENT_GRADE_TABS: GradeTab[] = [
  { tab: "Kindergarten", id: "K", grade: "K", building: buildingForGrade("K") },
  { tab: "1st Grade", id: "G1", grade: "1", building: buildingForGrade("1") },
  { tab: "2nd Grade", id: "G2", grade: "2", building: buildingForGrade("2") },
  { tab: "3rd Grade", id: "G3", grade: "3", building: buildingForGrade("3") },
  { tab: "4th Grade", id: "G4", grade: "4", building: buildingForGrade("4") },
  { tab: "5th Grade", id: "G5", grade: "5", building: buildingForGrade("5") },
  { tab: "6th Grade", id: "G6", grade: "6", building: buildingForGrade("6") },
  { tab: "7th Grade", id: "G7", grade: "7", building: buildingForGrade("7") },
  { tab: "8th Grade", id: "G8", grade: "8", building: buildingForGrade("8") },
  { tab: "9th Grade", id: "G9", grade: "9", building: buildingForGrade("9") },
  { tab: "10th Grade", id: "G10", grade: "10", building: buildingForGrade("10") },
  { tab: "11th Grade", id: "G11", grade: "11", building: buildingForGrade("11") },
  { tab: "12th Grade", id: "G12", grade: "12", building: buildingForGrade("12") },
];

const TEACHERS_TAB: GradeTab = {
  tab: "teachers",
  id: "STAFF",
  grade: "",
  building: "STAFF",
};

function tabsFor(includeTeachers: boolean): GradeTab[] {
  return includeTeachers ? [...STUDENT_GRADE_TABS, TEACHERS_TAB] : STUDENT_GRADE_TABS;
}

const BASE_MAPPING = {
  firstName: "First Name",
  lastName: "Last Name",
};

interface DateProduct {
  /** Short label shown in the UI (e.g. "May 6"). */
  date: string;
  /** ISO date for sorting / "today" comparison. */
  iso: string;
}

interface ItemDef {
  /** Used in the spreadsheet's row-1 header above the date (e.g. "C&J", "PIZZA"). */
  product: string;
  /** Pretty display label (e.g. "Chips & Juice", "Pizza Slice"). */
  display: string;
}

function makeItems(dates: DateProduct[], products: ItemDef[]): FundraiserItem[] {
  const out: FundraiserItem[] = [];
  for (const d of dates) {
    for (const p of products) {
      out.push({
        id: `${d.iso}-${p.product.toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
        name: `${d.date} · ${p.display}`,
        // Composite header from the parser is `"${row1} — ${row2}"`. Row 1 has
        // the product, row 2 has the date.
        quantityColumn: `${p.product} — ${d.date}`,
        deliveryDate: d.iso,
      });
    }
  }
  return out;
}

function buildWorksheets(tabs: GradeTab[], items: FundraiserItem[]): WorksheetSource[] {
  return tabs.map((t) => ({
    id: t.id,
    name: t.tab,
    headerRow: 2,
    headerRowsCount: 2,
    dataStartRow: 3,
    gradeOverride: t.grade,
    buildingOverride: t.building,
    columnMapping: BASE_MAPPING,
    items,
  }));
}

const PIZZA_DATES: DateProduct[] = [
  { date: "MAY 6", iso: "2026-05-06" },
  { date: "MAY 13", iso: "2026-05-13" },
  { date: "MAY 20", iso: "2026-05-20" },
  { date: "MAY 27", iso: "2026-05-27" },
];

const PIZZA_PRODUCTS: ItemDef[] = [
  { product: "C&J", display: "Chips & Juice" },
  { product: "PIZZA", display: "Pizza" },
];

const EMPANADA_DATES: DateProduct[] = [
  { date: "May 1", iso: "2026-05-01" },
  { date: "May 8", iso: "2026-05-08" },
  { date: "May 22", iso: "2026-05-22" },
  { date: "May 29", iso: "2026-05-29" },
];

const EMPANADA_PRODUCTS: ItemDef[] = [
  { product: "C&J", display: "Chips & Juice" },
  { product: "Cheese", display: "Cheese Empanada" },
  { product: "Pork", display: "Pork Empanada" },
  { product: "Chicken", display: "Chicken Empanada" },
];

export function buildRealFundraisers(opts: {
  pizzaSheetUrl?: string;
  empanadasSheetUrl?: string;
  subwaySheetUrl?: string;
  icecreamSheetUrl?: string;
  accessCodes?: Record<string, string>;
}): Fundraiser[] {
  const codes = opts.accessCodes ?? {};

  const pizzaItems = makeItems(PIZZA_DATES, PIZZA_PRODUCTS);
  const empanadaItems = makeItems(EMPANADA_DATES, EMPANADA_PRODUCTS);

  return [
    {
      id: "juniors-pizza",
      name: "Junior Pizza Fundraiser",
      classYear: "Juniors",
      accessCode: codes["juniors-pizza"] ?? "pizza2026",
      color: "from-red-500 to-orange-500",
      emoji: "🍕",
      sheetConfig: {
        sheetUrl: opts.pizzaSheetUrl ?? "",
        worksheets: buildWorksheets(tabsFor(true), pizzaItems),
      },
    },
    {
      id: "seniors-empanadas",
      name: "Senior Empanada Fundraiser",
      classYear: "Seniors",
      accessCode: codes["seniors-empanadas"] ?? "empanada2026",
      color: "from-amber-500 to-yellow-500",
      emoji: "🥟",
      sheetConfig: {
        sheetUrl: opts.empanadasSheetUrl ?? "",
        worksheets: buildWorksheets(tabsFor(false), empanadaItems),
      },
    },
    {
      id: "sophomores-subway",
      name: "Sophomore Subway Fundraiser",
      classYear: "Sophomores",
      accessCode: codes["sophomores-subway"] ?? "subway2026",
      color: "from-green-500 to-emerald-600",
      emoji: "🥪",
      sheetConfig: {
        sheetUrl: opts.subwaySheetUrl ?? "",
        // Placeholder until you share the real sheet structure. Edit on Settings.
        worksheets: buildWorksheets(tabsFor(false), []),
      },
    },
    {
      id: "freshmen-icecream",
      name: "Freshmen Ice Cream Fundraiser",
      classYear: "Freshmen",
      accessCode: codes["freshmen-icecream"] ?? "icecream2026",
      color: "from-sky-500 to-indigo-500",
      emoji: "🍦",
      sheetConfig: {
        sheetUrl: opts.icecreamSheetUrl ?? "",
        worksheets: buildWorksheets(tabsFor(false), []),
      },
    },
  ];
}
