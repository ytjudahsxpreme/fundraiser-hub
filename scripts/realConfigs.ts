/**
 * Programmatic configuration for the real fundraiser sheets we saw in the
 * field. Used by the seed script.
 */
import {
  buildingForGrade,
  type Building,
  type Fundraiser,
  type FundraiserItem,
  type ItemAttribute,
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
  date: string;
  iso: string;
}

interface ItemDef {
  product: string;
  display: string;
}

function makeItems(dates: DateProduct[], products: ItemDef[]): FundraiserItem[] {
  const out: FundraiserItem[] = [];
  for (const d of dates) {
    for (const p of products) {
      out.push({
        id: `${d.iso}-${p.product.toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
        name: `${d.date} · ${p.display}`,
        quantityColumn: `${p.product} — ${d.date}`,
        deliveryDate: d.iso,
      });
    }
  }
  return out;
}

function buildGradeTabWorksheets(tabs: GradeTab[], items: FundraiserItem[]): WorksheetSource[] {
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

// ── Pizza ────────────────────────────────────────────────────────────────────

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

// ── Empanadas ────────────────────────────────────────────────────────────────

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

// ── Ice Cream ────────────────────────────────────────────────────────────────
// Same shape as Pizza/Empanada: 13 tabs (K-12), multi-row headers, dated cols.
// The sheet has a NUTTY column between each week's block that has no row-2
// date — we skip those since they aren't tied to a delivery date.

const ICECREAM_DATES: DateProduct[] = [
  { date: "MAY 7", iso: "2026-05-07" },
  { date: "MAY 14", iso: "2026-05-14" },
  { date: "MAY 21", iso: "2026-05-21" },
  { date: "MAY 28", iso: "2026-05-28" },
];

const ICECREAM_PRODUCTS: ItemDef[] = [
  { product: "STRAW", display: "Strawberry" },
  { product: "ORANGE", display: "Orange" },
  { product: "SAND", display: "Sandwich" },
  { product: "DIXIE", display: "Dixie Cup" },
];

// ── Subway ───────────────────────────────────────────────────────────────────
// 34 tabs; each tab IS one delivery date. Tab names encode the date as MMDD,
// MM+D, M+DD, or M+D depending on digit count. School year is Sept 2025 →
// May 2026, so months 9-12 are 2025 and months 1-5 are 2026.

const SUBWAY_TAB_TO_ISO: Record<string, string> = {
  "923": "2025-09-23",
  "930": "2025-09-30",
  "107": "2025-10-07",
  "1014": "2025-10-14",
  "1021": "2025-10-21",
  "1028": "2025-10-28",
  "114": "2025-11-04",
  "1111": "2025-11-11",
  "1118": "2025-11-18",
  "1125": "2025-11-25",
  "129": "2025-12-09",
  "1216": "2025-12-16",
  "16": "2026-01-06",
  "113": "2026-01-13",
  "120": "2026-01-20",
  "127": "2026-01-27",
  "23": "2026-02-03",
  "210": "2026-02-10",
  "217": "2026-02-17",
  "224": "2026-02-24",
  "122": "2026-01-22",
  "33": "2026-03-03",
  "310": "2026-03-10",
  "317": "2026-03-17",
  "324": "2026-03-24",
  "331": "2026-03-31",
  "47": "2026-04-07",
  "414": "2026-04-14",
  "421": "2026-04-21",
  "428": "2026-04-28",
  "55": "2026-05-05",
  "512": "2026-05-12",
  "519": "2026-05-19",
  "526": "2026-05-26",
};

const SUBWAY_TOPPING_ATTRS: ItemAttribute[] = [
  { column: "Cheese", label: "Cheese", type: "boolean" },
  { column: "Lettuce", label: "Lettuce", type: "boolean" },
  { column: "Tomatoes", label: "Tomato", type: "boolean" },
  { column: "Mustard", label: "Mustard", type: "boolean" },
  { column: "Mayo", label: "Mayo", type: "boolean" },
];

const SUBWAY_ITEMS: FundraiserItem[] = [
  {
    id: "sub",
    name: "Sub",
    identifierColumn: "#",
    attributes: [
      { column: "Meat", label: "Meat", type: "text" },
      ...SUBWAY_TOPPING_ATTRS,
    ],
  },
];

function buildSubwayWorksheets(): WorksheetSource[] {
  const out: WorksheetSource[] = [];
  for (const [tab, iso] of Object.entries(SUBWAY_TAB_TO_ISO)) {
    out.push({
      id: `subway-${iso}`,
      name: tab,
      headerRow: 1,
      dataStartRow: 2,
      deliveryDateOverride: iso,
      columnMapping: {
        firstName: "", // unused
        lastName: "", // unused
        fullNameColumn: "Name",
        grade: "Grade",
      },
      items: SUBWAY_ITEMS,
    });
  }
  return out;
}

// ── Fundraiser assembly ──────────────────────────────────────────────────────

export function buildRealFundraisers(opts: {
  pizzaSheetUrl?: string;
  empanadasSheetUrl?: string;
  subwaySheetUrl?: string;
  icecreamSheetUrl?: string;
  accessCodes?: Record<string, string>;
}): Fundraiser[] {
  const codes = opts.accessCodes ?? {};

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
        worksheets: buildGradeTabWorksheets(tabsFor(true), makeItems(PIZZA_DATES, PIZZA_PRODUCTS)),
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
        worksheets: buildGradeTabWorksheets(tabsFor(false), makeItems(EMPANADA_DATES, EMPANADA_PRODUCTS)),
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
        worksheets: buildSubwayWorksheets(),
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
        worksheets: buildGradeTabWorksheets(tabsFor(false), makeItems(ICECREAM_DATES, ICECREAM_PRODUCTS)),
      },
    },
  ];
}
