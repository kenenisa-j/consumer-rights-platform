import { SUB_CITIES } from "@/content/common";
import type { GovLevel } from "@/types/gov";
import type { Allowed, CatItem, ContentItem, Person } from "@/features/gov/admin-state";

// Administration demo data per level (prototype/{woreda,subcity,bureau}/staff|offices|categories|content|settings.html).
// Fictional people. The backend returns only what the signed-in membership may manage.
const p = (id: string, name: string, role: string, office: string, cases: number, status: Person["status"] = "Active"): Person =>
  ({ id, name, email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`, role, office, status, cases });

const W7 = "Woreda 7, Akaki Kality";
const AK = "Akaki Kality Sub-City";

export const STAFF: Record<GovLevel, Person[]> = {
  woreda: [p("w1", "Meron Tadesse", "Woreda officer and administrator", W7, 3), p("w2", "Dawit Kebede", "Woreda officer", W7, 3),
    p("w3", "Hana Girma", "Woreda desk officer", W7, 3), p("w4", "Bereket Lemma", "Woreda officer", W7, 0, "On leave")],
  subcity: [p("s1", "Tsehay Bekele", "Sub-City officer and administrator", AK, 9), p("s2", "Kebede Alemu", "Sub-City officer", AK, 9),
    p("s3", "Samuel Haile", "Woreda officer and administrator", "Woreda 3", 5), p("s4", "Abel Tesfaye", "Woreda officer and administrator", "Woreda 5", 4),
    p("s5", "Meron Tadesse", "Woreda officer and administrator", "Woreda 7", 4), p("s6", "Rahel Mamo", "Woreda officer and administrator", "Woreda 9", 6),
    p("s7", "Yared Kassa", "Woreda officer and administrator", "Woreda 11", 3)],
  bureau: [p("b1", "Abebech Mulugeta", "City Bureau officer and administrator", "City Bureau", 12), p("b2", "Yonas Girma", "City Bureau officer", "City Bureau", 8),
    p("b3", "Selamawit Hailu", "City Bureau officer", "City Bureau", 6), p("b4", "Tsehay Bekele", "Sub-City officer", AK, 9),
    p("b5", "Meron Tadesse", "Woreda officer", W7, 3), p("b6", "Dawit Kebede", "Woreda officer", W7, 3), p("b7", "Liya Solomon", "Content administrator", "City Bureau", 0)]
};

export const STAFF_ALLOWED: Record<GovLevel, Allowed> = {
  woreda: { roles: ["Woreda officer", "Woreda desk officer", "Woreda officer and administrator"], offices: [W7] },
  subcity: { roles: ["Sub-City officer", "Sub-City officer and administrator", "Woreda officer and administrator"], offices: [AK, "Woreda 3", "Woreda 5", "Woreda 7", "Woreda 9", "Woreda 11"] },
  bureau: { roles: ["Woreda officer", "Sub-City officer", "City Bureau officer", "City Bureau officer and administrator", "Content administrator"],
    offices: ["City Bureau", ...SUB_CITIES.map(s => `${s} Sub-City`), W7] }
};

export const STAFF_INTRO: Record<GovLevel, string> = {
  woreda: "You manage the staff of Woreda 7. Other offices manage their own staff.",
  subcity: "You manage the Sub-City staff, and the lead officer of each Woreda in Akaki Kality.",
  bureau: "Government users, their role and the office they work in."
};

export interface OfficeInfo { office: string; rows: [string, string][]; editable: boolean }
export const OFFICE: Record<GovLevel, OfficeInfo> = {
  woreda: { office: "Woreda 7 Trade Office", editable: true, rows: [["Office", "Woreda 7 Trade Office"], ["Sub-City", "Akaki Kality"],
    ["Address", "Woreda 7 administration building, ground floor"], ["Phone", "0116 000 707"], ["Open", "Monday to Friday, 8:30 to 17:30"], ["Meeting room", "Room 3"]] },
  subcity: { office: "Akaki Kality Sub-City Trade Office", editable: true, rows: [["Office", "Akaki Kality Sub-City Trade Office"], ["Above you", "Addis Ababa City Bureau"],
    ["Address", "Akaki Kality Sub-City administration building, 2nd floor"], ["Phone", "0116 000 700"], ["Open", "Monday to Friday, 8:30 to 17:30"], ["Meeting room", "Hall B"]] },
  bureau: { office: "Addis Ababa City Bureau", editable: false, rows: [] }
};

export const PATH: Record<GovLevel, { name: string; note: string; here?: boolean }[]> = {
  woreda: [{ name: "Business", note: "Tries to agree with the consumer first." }, { name: "Woreda 7", note: "You are here. Resolve it, or pass it up.", here: true },
    { name: "Akaki Kality Sub-City", note: "Tsehay Bekele. Takes what you cannot resolve." }, { name: "City Bureau", note: "Last level." }],
  subcity: [{ name: "Business", note: "Tries to agree with the consumer first." }, { name: "Woredas", note: "First level. Pass up what they cannot resolve." },
    { name: "Akaki Kality Sub-City", note: "You are here. Resolve it, or pass it up.", here: true }, { name: "City Bureau", note: "Last level." }],
  bureau: [{ name: "Business", note: "Tries to agree with the consumer first." }, { name: "Woreda", note: "First government level. Passes it up if not resolved." },
    { name: "Sub-City", note: "Second level. Passes it up if not resolved." }, { name: "City Bureau", note: "Last level. Settles it, or refers it for action.", here: true }]
};

export const PLACES: Record<GovLevel, { title: string; head: string[]; rows: string[][] }> = {
  woreda: { title: "Markets in your Woreda", head: ["Market", "Businesses on AddisB2B", "Open cases"], rows: [["Market 097 ቃሊቲ ገብርኤል", "42", "2"], ["Kality Sunday Market", "18", "1"], ["Gelan road shops", "25", "0"]] },
  subcity: { title: "Woredas in Akaki Kality", head: ["Woreda", "Lead officer", "Open cases"], rows: [["Woreda 3", "Samuel Haile", "5"], ["Woreda 5", "Abel Tesfaye", "4"], ["Woreda 7", "Meron Tadesse", "4"], ["Woreda 9", "Rahel Mamo", "6"], ["Woreda 11", "Yared Kassa", "3"]] },
  bureau: { title: "Sub-City offices", head: ["Sub-City", "Coordinator", "Open cases"], rows: [["Addis Ketema", "Hana Tesfaye", "6"], ["Akaki Kality", "Tsehay Bekele", "9"], ["Arada", "Mulu Gebre", "4"], ["Bole", "Rahel Abate", "11"],
    ["Gulele", "Samson Dida", "5"], ["Kirkos", "Lemlem Assefa", "7"], ["Kolfe Keranio", "Birhanu Tola", "8"], ["Lemi Kura", "Aster Negash", "3"], ["Lideta", "Kidus Mekonnen", "4"],
    ["Nifas Silk-Lafto", "Fikir Alem", "6"], ["Yeka", "Zerihun Wolde", "8"]] }
};

const cat = (...names: string[]): CatItem[] => names.map((name, i) => ({ id: `c${i + 1}`, name }));
export const CATEGORY_LISTS: { key: string; title: string; items: CatItem[] }[] = [
  { key: "complaint", title: "Complaint categories", items: cat("Misleading commercial practice", "Defective or substandard goods", "Expired products", "Unsafe products", "Price above the official ceiling", "Wrong weight or measure", "Service complaint", "Other") },
  { key: "tip", title: "Tip categories", items: cat("Prices above the official list", "Goods hidden or held back", "Expired or unsafe goods on sale", "False scales or short weight", "Misleading advertising", "Something else") },
  { key: "solution", title: "Solution types", items: cat("Refund", "Replacement", "Repair", "Other agreement") }
];

const c = (id: string, title: string, type: string, status: ContentItem["status"], updated: string, extra: Partial<ContentItem> = {}): ContentItem => ({ id, title, type, status, updated, ...extra });
export const CONTENT: Record<GovLevel, ContentItem[]> = {
  woreda: [c("n1", "Scale checks at Market 097 this Sunday", "Local notice", "Waiting for the Sub-City", "6 Nov 2026"),
    c("n2", "Woreda 7 office closes at 12:00 on Friday 13 November", "Office closure", "Published", "2 Nov 2026"), c("n3", "Ask for a receipt: market day reminder", "Local notice", "Draft", "28 Oct 2026")],
  subcity: [c("n1", "Scale checks at Market 097 this Sunday", "Local notice", "Waiting for the Sub-City", "6 Nov 2026", { author: "Woreda 7, Meron Tadesse",
      body: "Officers will check the scales at every stall in Market 097 on Sunday 15 November from 9:00. Bring anything you bought that you think was short." }),
    c("n2", "Akaki Kality: price list for the week of 9 November", "Local notice", "Published", "9 Nov 2026"), c("n3", "Sub-City office moves to the 2nd floor", "Local notice", "Draft", "5 Nov 2026")],
  bureau: [c("n1", "Your rights as a consumer", "Rights article", "Published", "1 Nov 2026"), c("n2", "Trade Competition and Consumers Protection Proclamation No. 813/2013", "Law", "Published", "20 Oct 2026"),
    c("n3", "Check before you buy: expiry dates at Sunday Markets", "News", "Published", "3 Nov 2026"), c("n4", "Scales at all Sunday Markets will be checked this month", "News", "Published", "30 Oct 2026"),
    c("n5", "Reconciliation and settlement guideline", "Guide", "Draft", "5 Nov 2026"), c("n6", "Complaint procedure directive", "Law", "Archived", "12 Jun 2026")]
};

export const CONTENT_INTRO: Record<GovLevel, string> = {
  woreda: "Local notices for people in Woreda 7. The Sub-City approves them before they show on the public site.",
  subcity: "Local notices for people in Akaki Kality. You approve the notices your Woredas send.",
  bureau: "Rights articles, laws and news shown on the public site."
};

export interface Settings { assign: string; urgent: string; tips: string; n1: boolean; n2: boolean; n3: boolean }
export const SETTINGS: Record<"woreda" | "subcity", Settings> = {
  woreda: { assign: "fewest", urgent: "Dawit Kebede", tips: "", n1: true, n2: true, n3: false },
  subcity: { assign: "fewest", urgent: "Kebede Alemu", tips: "Keep at the Sub-City", n1: true, n2: false, n3: true }
};
export const URGENT_OFFICERS: Record<"woreda" | "subcity", string[]> = { woreda: ["Dawit Kebede", "Meron Tadesse", "Hana Girma"], subcity: ["Kebede Alemu", "Tsehay Bekele"] };
export const CITY_SETTINGS = { number: "8070", hours: "Monday to Friday, 8:30 to 17:30", reply: 48, review: 2, woreda: 5, subcity: 5, bureau: 5 };
