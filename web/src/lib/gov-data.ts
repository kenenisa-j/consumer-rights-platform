import type { CaseRow, GovLevel } from "@/types/gov";
import { statusOf } from "./case-status";
import { serverGet } from "./server-api";

/** One case in an office's list, as `GET /api/office/cases` reports it. */
export interface OfficeCase {
  reference: string; title: string; status: string; urgent: boolean; route: "direct" | "business"; dueBy: string | null;
  category: { nameEn: string }; business: string; registeredBusiness: boolean;
  handledBy: { name: string; level: GovLevel | "business" } | null; createdAt: string; updatedAt: string; complainant: string; alias: string;
}
export interface OfficeCases { level: GovLevel; office: { name: string; nameAm: string }; cases: OfficeCase[] }

export const getOfficeCases = () => serverGet<OfficeCases>("/office/cases");

const NEW_HERE = new Set(["RECEIVED_BY_OFFICE", "ESCALATED_TO_GOVERNMENT", "UNDER_INITIAL_REVIEW"]);
export const isClosed = (c: OfficeCase) => statusOf(c.status).stage === "resolved";
/** A case that is new at the office and waits for someone to take it. */
export const needsAction = (c: OfficeCase) => !isClosed(c) && NEW_HERE.has(c.status);
export const isOverdue = (c: OfficeCase) => !isClosed(c) && !!c.dueBy && new Date(c.dueBy).getTime() < Date.now();

export function daysOpen(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? "Today" : d === 1 ? "1 day" : `${d} days`;
}

/** The rows of the Cases table. The filter group is a plain word the table's chips match. */
export function toRows(level: GovLevel, cases: OfficeCase[]): CaseRow[] {
  return cases.map(c => {
    const closed = isClosed(c);
    const group = closed ? "closed" : level === "bureau" ? (c.handledBy?.level ?? "woreda") : needsAction(c) ? "action" : "progress";
    return {
      reference: c.reference, title: c.title, business: c.business,
      via: level === "bureau" ? (c.handledBy?.name ?? "—") : c.route === "direct" ? "Sent straight to the office" : "Moved up from the business",
      status: statusOf(c.status).label, open: closed ? "Closed" : daysOpen(c.createdAt), group, action: needsAction(c), hasDetail: true
    };
  });
}
