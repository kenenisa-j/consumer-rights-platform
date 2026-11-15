import type { CaseData, UpdateEntry } from "@/types/case";
import { niceDate, statusOf } from "./case-status";
import { formatSize } from "./format";

/** One complaint as `GET /api/complaints/:reference` reports it. */
export interface ApiCase {
  reference: string; title: string; status: string; business: string; registeredBusiness: boolean; category: { nameEn: string };
  handledBy: { name: string; level: "business" | "woreda" | "subcity" | "bureau" } | null;
  narrative: string; item: string; boughtOn: string; amount: number; want: string; businessPlace: string | null;
  history: { status: string; note: string | null; at: string; level: string }[];
  evidence: { id: string; name: string; type: string; size: number; shared: boolean }[];
}

const WANT: Record<string, string> = { refund: "My money back", replacement: "A replacement", repair: "A repair", loss: "Payment for my loss", other: "Something else" };

/** "refund:3100" is stored as the kind and the amount asked for. */
export function wantText(raw: string): string {
  const [kind, amount] = raw.split(":");
  return `${WANT[kind] ?? kind}${amount ? `: ${Number(amount).toLocaleString("en")} ETB` : ""}`;
}

/** Turns a real case into the shape the case screen draws. */
export function toCaseData(c: ApiCase): CaseData {
  const st = statusOf(c.status);
  const stage = st.stage === "resolved" ? "resolved" : (c.handledBy?.level ?? "business");
  const updates: UpdateEntry[] = c.history.map(h => ({ title: statusOf(h.status).label, when: niceDate(h.at, true), iso: h.at, text: h.note ?? undefined }));
  return {
    reference: c.reference, title: c.title, stage, status: { label: st.label, tone: st.tone }, official: st.official, pending: "none",
    counterpart: c.handledBy ? "the officer" : "the business",
    banner: c.registeredBusiness ? undefined : { tone: "plain", title: "The business is not on AddisB2B", text: "Your complaint went straight to the office, not to the business." },
    details: {
      problem: c.category.nameEn, business: [c.business, c.businessPlace].filter(Boolean).join(", "), bought: `${c.item}, on ${niceDate(c.boughtOn)}`,
      paid: `${c.amount.toLocaleString("en")} ETB`, asked: wantText(c.want), narrative: c.narrative
    },
    handledBy: c.handledBy ? [["Office", c.handledBy.name]] : [["The business", c.business]],
    thread: [], updates, evidence: c.evidence.map(e => ({ id: e.id, name: e.name, note: e.type === "application/pdf" ? "PDF" : "Photo", size: formatSize(e.size), shared: e.shared })), closed: st.stage === "resolved", readOnly: true
  };
}
