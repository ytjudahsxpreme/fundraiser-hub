import {
  ALL_GRADES,
  buildingForGrade,
  studentKey,
  type Fundraiser,
  type FundraiserItem,
  type StudentOrder,
  type StudentOrderLine,
  type WorksheetSource,
} from "./types";

const FIRST_NAMES = [
  "Aiden", "Olivia", "Liam", "Emma", "Noah", "Ava", "Ethan", "Sophia", "Lucas", "Isabella",
  "Mason", "Mia", "Logan", "Charlotte", "Jackson", "Amelia", "Caden", "Harper", "Owen", "Evelyn",
  "Wyatt", "Abigail", "Sebastian", "Emily", "Jack", "Elizabeth", "Henry", "Avery", "Carter", "Ella",
  "Daniel", "Scarlett", "Matthew", "Grace", "Samuel", "Chloe", "David", "Victoria", "Joseph", "Riley",
  "Levi", "Aria", "Julian", "Lily", "Isaac", "Aubrey", "Gabriel", "Zoey", "Anthony", "Hannah",
  "Dylan", "Layla", "Leo", "Brooklyn", "Lincoln", "Penelope", "Jayden", "Stella", "Adrian", "Naomi",
  "Christian", "Maya", "Aaron", "Eliana", "Eli", "Audrey", "Charles", "Savannah", "Cameron", "Leah",
  "Connor", "Allison", "Jeremiah", "Gabriella", "Ezra", "Anna", "Thomas", "Sarah", "Robert", "Madison",
  "Andrew", "Aaliyah", "Theodore", "Camila", "Caleb", "Skylar", "Ryan", "Bella", "Asher", "Claire",
  "Nathan", "Lucy", "Hudson", "Paisley", "Christopher", "Everly", "Adam", "Ariana", "Jose", "Willow",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
  "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
  "O'Brien", "Patel", "Kim", "Murphy", "Cohen", "Reyes", "Cruz", "Morales", "Ortiz", "Gutierrez",
];

const NOTES_POOL = [
  "", "", "", "", "", "",
  "Paid",
  "Pickup with sibling",
  "Allergy: nuts",
  "Pickup Friday",
  "Parent will pick up",
];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rnd: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

interface GenOptions {
  fundraiserId: string;
  items: FundraiserItem[];
  count: number;
  seed: number;
  gradePool?: string[];
  /** chance each item shows up in a given row (defaults to 0.5) */
  itemChance?: number;
  /** assigns sequential identifier numbers (Subway) */
  sequentialIdsForItemId?: string;
  /** starting value for sequential ids */
  sequentialStart?: number;
}

interface GeneratedRow {
  firstName: string;
  lastName: string;
  grade: string;
  lines: StudentOrderLine[];
  notes?: string;
}

function generateRows(opts: GenOptions): GeneratedRow[] {
  const rnd = mulberry32(opts.seed);
  const pool = opts.gradePool ?? ALL_GRADES;
  const rows: GeneratedRow[] = [];
  let seq = opts.sequentialStart ?? 1;
  for (let i = 0; i < opts.count; i++) {
    const firstName = pick(rnd, FIRST_NAMES);
    const lastName = pick(rnd, LAST_NAMES);
    const grade = pick(rnd, pool);

    const lines: StudentOrderLine[] = [];
    for (const item of opts.items) {
      const include = rnd() < (opts.itemChance ?? 0.5);
      if (!include) continue;
      const r = rnd();
      const quantity = r < 0.6 ? 1 : r < 0.85 ? 2 : r < 0.95 ? 3 : Math.ceil(rnd() * 5) + 2;
      let identifier: string | undefined;
      if (item.id === opts.sequentialIdsForItemId) {
        const nums: number[] = [];
        for (let k = 0; k < quantity; k++) nums.push(seq++);
        identifier = nums.map((n) => `#${n}`).join(", ");
      }
      lines.push({
        itemId: item.id,
        itemName: item.name,
        quantity,
        identifier,
      });
    }
    if (lines.length === 0) continue;
    const notes = pick(rnd, NOTES_POOL) || undefined;
    rows.push({ firstName, lastName, grade, lines, notes });
  }
  return rows;
}

function aggregateRowsIntoOrders(
  fundraiserId: string,
  rowsByWorksheet: GeneratedRow[][],
): StudentOrder[] {
  const map = new Map<string, StudentOrder>();
  for (const rows of rowsByWorksheet) {
    for (const r of rows) {
      const key = studentKey(r.firstName, r.lastName, r.grade);
      const existing = map.get(key);
      if (existing) {
        for (const line of r.lines) {
          existing.lines.push(line);
        }
        existing.totalQuantity = existing.lines.reduce((s, l) => s + l.quantity, 0);
        if (r.notes && !existing.notes) existing.notes = r.notes;
      } else {
        map.set(key, {
          id: `${fundraiserId}:${key}`,
          fundraiserId,
          firstName: r.firstName,
          lastName: r.lastName,
          grade: r.grade,
          building: buildingForGrade(r.grade),
          lines: [...r.lines],
          notes: r.notes,
          totalQuantity: r.lines.reduce((s, l) => s + l.quantity, 0),
        });
      }
    }
  }
  return Array.from(map.values());
}

const PIZZA_ITEMS: FundraiserItem[] = [
  { id: "pizza", name: "Pizza Slice", quantityColumn: "Pizza #" },
  { id: "chips", name: "Chips", quantityColumn: "Chips #" },
  { id: "juice", name: "Juice", quantityColumn: "Juice #" },
];

const EMPANADA_ITEMS: FundraiserItem[] = [
  { id: "beef", name: "Beef Empanada", quantityColumn: "Beef" },
  { id: "chicken", name: "Chicken Empanada", quantityColumn: "Chicken" },
  { id: "spinach", name: "Spinach Empanada", quantityColumn: "Spinach" },
  { id: "cheese", name: "Cheese Empanada", quantityColumn: "Cheese" },
  { id: "plantain", name: "Sweet Plantain", quantityColumn: "Plantain" },
];

const SUBWAY_ITEMS: FundraiserItem[] = [
  {
    id: "sub",
    name: "Sub",
    quantityColumn: "# Subs",
    identifierColumn: "Sub Numbers",
  },
];

const ICECREAM_ITEMS: FundraiserItem[] = [
  { id: "vanilla", name: "Vanilla", quantityColumn: "Vanilla" },
  { id: "chocolate", name: "Chocolate", quantityColumn: "Chocolate" },
  { id: "strawberry", name: "Strawberry", quantityColumn: "Strawberry" },
  { id: "cookie-dough", name: "Cookie Dough", quantityColumn: "Cookie Dough" },
  { id: "mint-chip", name: "Mint Chip", quantityColumn: "Mint Chip" },
];

const BASE_MAPPING = {
  firstName: "First Name",
  lastName: "Last Name",
  grade: "Grade",
  notes: "Notes",
};

const PIZZA_WORKSHEETS: WorksheetSource[] = [
  {
    id: "pizza-lower",
    name: "Lower School",
    headerRow: 3,
    dataStartRow: 4,
    columnMapping: BASE_MAPPING,
    items: PIZZA_ITEMS,
  },
  {
    id: "pizza-upper",
    name: "Upper School",
    headerRow: 3,
    dataStartRow: 4,
    columnMapping: BASE_MAPPING,
    items: PIZZA_ITEMS,
  },
];

const EMPANADA_WORKSHEETS: WorksheetSource[] = [
  {
    id: "empanada-main",
    name: "Orders",
    headerRow: 1,
    dataStartRow: 2,
    columnMapping: {
      firstName: "FirstName",
      lastName: "LastName",
      grade: "Grade Level",
      notes: "Memo",
    },
    items: EMPANADA_ITEMS,
  },
];

const SUBWAY_WORKSHEETS: WorksheetSource[] = [
  {
    id: "subway-main",
    name: "Orders",
    headerRow: 2,
    dataStartRow: 3,
    columnMapping: {
      firstName: "First",
      lastName: "Last",
      grade: "Gr",
    },
    items: SUBWAY_ITEMS,
  },
];

const ICECREAM_WORKSHEETS: WorksheetSource[] = [
  {
    id: "icecream-main",
    name: "Master",
    headerRow: 4,
    dataStartRow: 5,
    columnMapping: {
      firstName: "Student First",
      lastName: "Student Last",
      grade: "Grade",
      notes: "Comments",
    },
    items: ICECREAM_ITEMS,
  },
];

export const MOCK_FUNDRAISERS: Fundraiser[] = [
  {
    id: "juniors-pizza",
    name: "Junior Pizza Fundraiser",
    classYear: "Juniors",
    accessCode: "pizza2026",
    color: "from-red-500 to-orange-500",
    emoji: "🍕",
    sheetConfig: {
      sheetUrl: "https://docs.google.com/spreadsheets/d/EXAMPLE_PIZZA_SHEET/edit",
      worksheets: PIZZA_WORKSHEETS,
    },
  },
  {
    id: "seniors-empanadas",
    name: "Senior Empanada Fundraiser",
    classYear: "Seniors",
    accessCode: "empanada2026",
    color: "from-amber-500 to-yellow-500",
    emoji: "🥟",
    sheetConfig: {
      sheetUrl: "https://docs.google.com/spreadsheets/d/EXAMPLE_EMPANADA_SHEET/edit",
      worksheets: EMPANADA_WORKSHEETS,
    },
  },
  {
    id: "sophomores-subway",
    name: "Sophomore Subway Fundraiser",
    classYear: "Sophomores",
    accessCode: "subway2026",
    color: "from-green-500 to-emerald-600",
    emoji: "🥪",
    sheetConfig: {
      sheetUrl: "https://docs.google.com/spreadsheets/d/EXAMPLE_SUBWAY_SHEET/edit",
      worksheets: SUBWAY_WORKSHEETS,
    },
  },
  {
    id: "freshmen-icecream",
    name: "Freshmen Ice Cream Fundraiser",
    classYear: "Freshmen",
    accessCode: "icecream2026",
    color: "from-sky-500 to-indigo-500",
    emoji: "🍦",
    sheetConfig: {
      sheetUrl: "https://docs.google.com/spreadsheets/d/EXAMPLE_ICECREAM_SHEET/edit",
      worksheets: ICECREAM_WORKSHEETS,
    },
  },
];

const LE_UE_GRADES = ["K", "1", "2", "3", "4", "5"];
const MS_HS_GRADES = ["6", "7", "8", "9", "10", "11", "12"];

export const MOCK_ORDERS: StudentOrder[] = [
  ...aggregateRowsIntoOrders("juniors-pizza", [
    generateRows({
      fundraiserId: "juniors-pizza",
      items: PIZZA_ITEMS,
      count: 60,
      seed: 1011,
      gradePool: LE_UE_GRADES,
      itemChance: 0.6,
    }),
    generateRows({
      fundraiserId: "juniors-pizza",
      items: PIZZA_ITEMS,
      count: 55,
      seed: 1012,
      gradePool: MS_HS_GRADES,
      itemChance: 0.65,
    }),
  ]),
  ...aggregateRowsIntoOrders("seniors-empanadas", [
    generateRows({
      fundraiserId: "seniors-empanadas",
      items: EMPANADA_ITEMS,
      count: 95,
      seed: 2021,
      itemChance: 0.4,
    }),
  ]),
  ...aggregateRowsIntoOrders("sophomores-subway", [
    generateRows({
      fundraiserId: "sophomores-subway",
      items: SUBWAY_ITEMS,
      count: 130,
      seed: 3031,
      itemChance: 0.95,
      sequentialIdsForItemId: "sub",
      sequentialStart: 101,
    }),
  ]),
  ...aggregateRowsIntoOrders("freshmen-icecream", [
    generateRows({
      fundraiserId: "freshmen-icecream",
      items: ICECREAM_ITEMS,
      count: 140,
      seed: 4041,
      itemChance: 0.4,
    }),
  ]),
];
