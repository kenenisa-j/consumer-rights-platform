// How the database's case statuses read to a person. The database has 16 statuses; people see a plain sentence and a tone.
// The official name (shown small) is the name the Bureau uses in letters.
export type Tone = "info" | "ok" | "warn" | "bad" | "grey";

const T: Record<string, { label: string; official: string; tone: Tone; stage: "business" | "woreda" | "subcity" | "bureau" | "resolved" }> = {
  SUBMITTED_TO_BUSINESS: { label: "Sent to the business", official: "Submitted", tone: "info", stage: "business" },
  BUSINESS_OFFER_PENDING: { label: "The business made you an offer", official: "Offer pending", tone: "warn", stage: "business" },
  ESCALATED_TO_GOVERNMENT: { label: "Moved to the government office", official: "Escalated", tone: "info", stage: "woreda" },
  RECEIVED_BY_OFFICE: { label: "Received by the office", official: "Received", tone: "info", stage: "woreda" },
  UNDER_INITIAL_REVIEW: { label: "Being checked", official: "Under initial review", tone: "info", stage: "woreda" },
  OFFICER_ASSIGNED: { label: "An officer is handling it", official: "Assigned", tone: "info", stage: "woreda" },
  INSPECTION_PENDING: { label: "A visit is planned", official: "Inspection pending", tone: "info", stage: "woreda" },
  INSPECTION_ACTIVE: { label: "Being investigated", official: "Under investigation", tone: "info", stage: "woreda" },
  INSPECTION_COMPLETED: { label: "Investigation finished", official: "Inspection completed", tone: "info", stage: "woreda" },
  CONCILIATION_SCHEDULED: { label: "Meeting to agree a solution", official: "Under reconciliation", tone: "warn", stage: "woreda" },
  SETTLEMENT_OFFERED: { label: "A solution was offered", official: "Settlement pending", tone: "warn", stage: "woreda" },
  RESOLVED_MUTUALLY: { label: "Resolved by agreement", official: "Resolved", tone: "ok", stage: "resolved" },
  RESOLVED_ADMINISTRATIVE_ORDER: { label: "Resolved by an order", official: "Resolved", tone: "ok", stage: "resolved" },
  COURT_REFERRAL_ISSUED: { label: "Sent on to the court", official: "Referred", tone: "grey", stage: "resolved" },
  CLOSED_OUTSIDE_JURISDICTION: { label: "Not handled by this office", official: "Outside jurisdiction", tone: "grey", stage: "resolved" },
  CLOSED_WITHDRAWN: { label: "Withdrawn", official: "Closed", tone: "grey", stage: "resolved" }
};

export function statusOf(code: string) {
  return T[code] ?? { label: code.replace(/_/g, " ").toLowerCase(), official: code, tone: "grey" as Tone, stage: "woreda" as const };
}

export const LEVEL_NAME = { business: "The business", woreda: "Woreda office", subcity: "Sub-City office", bureau: "City Bureau" } as const;

/** 4 November 2026, in Addis Ababa time. */
export function niceDate(iso: string, withTime = false): string {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Addis_Ababa", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) };
  return new Intl.DateTimeFormat("en-GB", opts).format(d);
}
