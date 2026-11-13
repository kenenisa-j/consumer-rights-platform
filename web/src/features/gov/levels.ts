import type { IconName } from "@/components/ui/Icon";
import type { GovLevel } from "@/types/gov";

export const GOV_LEVELS: readonly GovLevel[] = ["woreda", "subcity", "bureau"];
export const isGovLevel = (v: string): v is GovLevel => (GOV_LEVELS as readonly string[]).includes(v);

export interface LevelConfig {
  key: GovLevel;
  portal: string;            // "Woreda portal"
  office: string;            // who is working
  levelName: string;         // "Woreda", "Sub-City", "City Bureau"
  person: { name: string; role: string; initials: string };
  upTo: string | null;       // the office a case passes up to; null at the last level
  counts: { cases: number; calls: number; tips: number; messages: number; content?: number };
  caseFilters: { value: string; label: string }[];
}

// Demo people and offices (prototype/docs/demo-data.md). Real values come from the signed-in membership.
export const LEVELS: Record<GovLevel, LevelConfig> = {
  woreda: {
    key: "woreda", portal: "Woreda portal", office: "Woreda 7, Akaki Kality", levelName: "Woreda",
    person: { name: "Meron Tadesse", role: "Woreda officer and administrator · Woreda 7, Akaki Kality", initials: "MT" },
    upTo: "Akaki Kality Sub-City", counts: { cases: 2, calls: 1, tips: 2, messages: 3 },
    caseFilters: [{ value: "all", label: "All" }, { value: "action", label: "Needs action" }, { value: "progress", label: "In progress" }, { value: "closed", label: "Closed" }]
  },
  subcity: {
    key: "subcity", portal: "Sub-City portal", office: "Akaki Kality Sub-City", levelName: "Sub-City",
    person: { name: "Tsehay Bekele", role: "Sub-City officer and administrator · Akaki Kality Sub-City", initials: "TB" },
    upTo: "Addis Ababa City Bureau", counts: { cases: 1, calls: 1, tips: 2, messages: 2, content: 1 },
    caseFilters: [{ value: "all", label: "All" }, { value: "action", label: "Needs action" }, { value: "progress", label: "In progress" }, { value: "closed", label: "Closed" }]
  },
  bureau: {
    key: "bureau", portal: "City Bureau portal", office: "Addis Ababa City Bureau", levelName: "City Bureau",
    person: { name: "Abebech Mulugeta", role: "City Bureau officer and administrator · Addis Ababa City Bureau", initials: "AM" },
    upTo: null, counts: { cases: 45, calls: 6, tips: 3, messages: 3 },
    caseFilters: [{ value: "all", label: "All" }, { value: "woreda", label: "At a Woreda" }, { value: "subcity", label: "At a Sub-City" }, { value: "bureau", label: "At the City Bureau" }, { value: "closed", label: "Closed" }]
  }
};

export interface MenuItem { slug: string; label: string; icon: IconName; count?: keyof LevelConfig["counts"] }
export interface MenuGroup { title: string; items: MenuItem[] }

/** The same side menu at all three levels; each page is scoped to the level (prototype/PLAN.md section 0.2). */
export const GOV_MENU: MenuGroup[] = [
  { title: "Work", items: [
    { slug: "dashboard", label: "Dashboard", icon: "grid" }, { slug: "cases", label: "Cases", icon: "folder", count: "cases" },
    { slug: "intake", label: "New complaint", icon: "plus" }, { slug: "calls", label: "Free call line", icon: "phone", count: "calls" },
    { slug: "tips", label: "Tips", icon: "flag", count: "tips" }, { slug: "messages", label: "Messages", icon: "chat", count: "messages" }] },
  { title: "Insight", items: [{ slug: "reports", label: "Reports", icon: "chart" }] },
  { title: "Administration", items: [
    { slug: "staff", label: "Staff and roles", icon: "users" }, { slug: "offices", label: "Offices", icon: "building" },
    { slug: "categories", label: "Categories", icon: "tag" }, { slug: "content", label: "Public content", icon: "news", count: "content" },
    { slug: "settings", label: "Settings", icon: "sliders" }] }
];

