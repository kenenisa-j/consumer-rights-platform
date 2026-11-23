import type { UpdateEntry } from "@/types/case";
import type { BizCase, BizMessage, BizSummary } from "@/types/biz";

// The business's view of the demo case CC-2026-00123 (Gebriel Grain Traders). `step` shows where the case stands.
// Everything here is the LIMITED view: the consumer is only "Consumer 00123".
export const BIZ_STEPS = ["reply", "answer", "agreed", "woreda", "settlement", "resolved"] as const;
export type BizStep = (typeof BIZ_STEPS)[number];

const C = "Consumer 00123";
const u = (title: string, when: string, iso: string, text?: string): UpdateEntry => ({ title, when, iso, text });
const m = (id: string, from: BizMessage["from"], who: string, when: string, text: string): BizMessage => ({ id, from, who, when, text });

const RECEIVED = u("Complaint received", "Monday 2 November, 09:40", "2026-11-02T09:40", "A consumer complained about this sale.");
const REPLIED = u("You replied", "Tuesday 3 November, 09:15", "2026-11-03T09:15", "You offered a new 25 kg sack.");
const ANSWERED = u("The consumer answered", "Tuesday 3 November, 12:05", "2026-11-03T12:05", "They want a refund of 2,250 ETB instead.");

const SAYS = [["Consumer", C], ["Problem", "Wrong weight or measure"], ["Item", "White rice, one 25 kg sack"], ["Bought", "Sunday 1 November 2026"], ["Paid", "2,250 ETB"],
  ["The consumer asks for", "A refund of 2,250 ETB"]] as const;
const NARRATIVE = "On Sunday 1 November the consumer bought a 25 kg sack of white rice. At home it weighed 21 kg and there were small stones in it. They went back the same day and the seller would not change it.";
const EVIDENCE = [
  { name: "receipt-rice.jpg", note: "Receipt", size: "240 KB", shared: true },
  { name: "sack-on-scale.jpg", note: "The sack on a scale showing 21 kg", size: "1.1 MB", shared: true },
  { name: "stones-in-rice.jpg", note: "Stones found in the rice", size: "870 KB", shared: true }];

const T_OPEN: BizMessage[] = [m("t1", "consumer", C, "Mon 2 Nov, 09:40", "The sack weighed 21 kg and had small stones in it. I ask for my money back, 2,250 ETB.")];
const T_OFFER: BizMessage[] = [m("t3", "consumer", C, "Tue 3 Nov, 12:05", "A new sack is not enough for me. I would like a refund of 2,250 ETB."),
  m("t2", "me", "You", "Tue 3 Nov, 09:15", "We are sorry. The sacks come from our supplier and we did not weigh each one. We offer a new 25 kg sack."), ...T_OPEN];
const ASKS = ["An explanation and anything that shows where the rice came from", "A visit to your stall by an officer from the Woreda", "A meeting with the consumer to agree a solution"];

export function buildBizCase(step: BizStep): BizCase {
  const base: BizCase = { reference: "CC-2026-00123", title: "Rice sold short and mixed with stones", alias: C, consumerSays: SAYS, narrative: NARRATIVE, evidence: EVIDENCE,
    status: { label: "Reply needed", tone: "warn" }, official: "Awaiting Merchant Response", pending: "reply", deadline: "Wednesday 4 November 2026, 09:40",
    thread: T_OPEN, history: [RECEIVED] };
  switch (step) {
    case "reply": return base;
    case "answer": return { ...base, status: { label: "The consumer answered: your answer is needed", tone: "warn" }, official: "Sent to the business", pending: "answer", deadline: undefined,
      banner: { tone: "warn", title: "The consumer wants a refund of 2,250 ETB, not a new sack", text: "Agree a fair solution together and the complaint is resolved. If you cannot agree, the consumer can move it to the Woreda." },
      thread: T_OFFER, history: [ANSWERED, REPLIED, RECEIVED] };
    case "agreed": return { ...base, status: { label: "Refund to be paid", tone: "ok" }, official: "Resolved by agreement", pending: "agreed", deadline: "Thursday 5 November 2026", proofRequired: false,
      banner: { tone: "ok", title: "You and the consumer agreed. The government did not need to step in.", text: "Agreed on Tuesday 3 November, 14:50." },
      agreement: [["Refund", "2,250 ETB to the consumer"], ["How", "In cash, at your stall or an office you both choose"], ["By", "Thursday 5 November 2026"], ["Also", "Weigh every sack before selling it"]],
      thread: T_OFFER, history: [u("The consumer accepted", "Tuesday 3 November, 14:50", "2026-11-03T14:50", "Agreed. The government was not involved."),
        u("You offered the refund", "Tuesday 3 November, 14:30", "2026-11-03T14:30", "2,250 ETB in cash within 2 days."), ANSWERED, REPLIED, RECEIVED] };
    case "woreda": return { ...base, status: { label: "With the Woreda", tone: "info" }, official: "Moved to the Woreda", pending: "gov", deadline: undefined,
      banner: { tone: "plain", title: "You could not agree, so the consumer moved it to the Woreda 7 Trade Office", text: "You may be asked to explain, to show records, and to attend a meeting." },
      gov: { office: "Woreda 7 Trade Office, Akaki Kality", officer: "Meron Tadesse", asks: ASKS }, handledBy: [["Office", "Woreda 7 Trade Office, Akaki Kality"], ["Officer", "Meron Tadesse"]],
      thread: T_OFFER, history: [u("The consumer moved it to the Woreda", "Wednesday 4 November, 08:30", "2026-11-04T08:30", "The Woreda 7 Trade Office is handling the complaint."),
        u("Offer kept", "Tuesday 3 November, 12:40", "2026-11-03T12:40", "You kept your offer of a new sack."), REPLIED, RECEIVED] };
    case "settlement": return { ...base, status: { label: "Refund due", tone: "warn" }, official: "Settlement Pending", pending: "settlement", deadline: "Thursday 12 November 2026, 12:00", proofRequired: true,
      gov: { office: "Addis Ababa City Bureau", officer: "Yonas Girma", asks: [] }, handledBy: [["Office", "Addis Ababa City Bureau"], ["Officer", "Yonas Girma"], ["Earlier", "Woreda 7, then Akaki Kality Sub-City"]],
      banner: { tone: "ok", title: "Agreed on Wednesday 11 November, 11:25" },
      agreement: [["Refund", "2,250 ETB to the consumer"], ["How", "In cash, at the City Bureau office, in front of the officer"], ["By", "Thursday 12 November 2026, 12:00"], ["Also", "Weigh every sack before selling it"]],
      thread: T_OFFER, history: [u("Solution agreed", "Wednesday 11 November, 11:25", "2026-11-11T11:25", "Refund of 2,250 ETB by Thursday 12 November, 12:00."),
        u("The City Bureau accepted the case", "Tuesday 10 November, 09:00", "2026-11-10T09:00", "Officer Yonas Girma."), REPLIED, RECEIVED] };
    case "resolved": return { ...base, status: { label: "Resolved", tone: "ok" }, official: "Resolved", pending: "none", closed: true, deadline: undefined,
      banner: { tone: "ok", title: "The refund was paid and the complaint is resolved.", text: "It closes on Monday 16 November." }, thread: T_OFFER,
      history: [u("Resolved", "Thursday 12 November, 09:45", "2026-11-12T09:45", "The officer confirmed the refund."), REPLIED, RECEIVED] };
  }
}

export async function getBizCase(reference: string, step?: string): Promise<BizCase | null> {
  try {
    const { cookies } = await import("next/headers");
    const { API_URL } = await import("@/lib/session");
    const jar = await cookies();
    if (jar.getAll().length > 0) {
      const res = await fetch(`${API_URL}/api/business/cases/${reference}`, {
        headers: { cookie: jar.toString() },
        cache: "no-store",
      });
      if (res.ok) {
        const body = await res.json();
        const c = body?.complaint;
        if (c) {
          const isSubmitted = c.status === "SUBMITTED_TO_BUSINESS";
          const isPendingOffer = c.status === "BUSINESS_OFFER_PENDING";
          const isResolved = c.status === "RESOLVED_MUTUALLY" || c.status === "RESOLVED_ADMINISTRATIVE_ORDER";
          const isClosed = isResolved || c.status === "CLOSED_WITHDRAWN" || c.status === "CLOSED_OUTSIDE_JURISDICTION";
          const isGov = c.status === "ESCALATED_TO_GOVERNMENT" || c.status === "RECEIVED_BY_OFFICE" || c.status === "UNDER_INITIAL_REVIEW" || c.status === "OFFICER_ASSIGNED";

          const pending = isSubmitted ? "reply" : isPendingOffer ? "none" : isGov ? "gov" : "none";

          const consumerSays: [string, string][] = [
            ["Consumer", c.complainant],
            ["Problem", c.category?.nameEn || c.categoryCode || "Problem"],
            ["Item", c.title],
            ["Bought", c.incidentDate ? new Date(c.incidentDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—"],
            ["Paid", `${c.disputedAmount} ${c.currency || "ETB"}`],
            ["The consumer asks for", c.desiredRemedy || "Resolution"]
          ];

          return {
            reference: c.reference,
            title: c.title,
            alias: c.complainant,
            status: {
              label: isSubmitted ? "Reply needed" : isPendingOffer ? "Waiting for the consumer" : isResolved ? "Resolved" : c.status.replace(/_/g, " ").toLowerCase(),
              tone: isSubmitted ? "warn" : isResolved ? "ok" : "info"
            },
            official: c.status.replace(/_/g, " "),
            pending,
            closed: isClosed,
            deadline: c.slaDeadline ? new Date(c.slaDeadline).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : undefined,
            consumerSays,
            narrative: c.desiredRemedy ? `${c.title}. Remedy desired: ${c.desiredRemedy}` : c.title,
            thread: (c.conversation?.messages || []).map((m: any) => ({
              id: m.id,
              from: m.from === "consumer" ? "consumer" : "me",
              who: m.sender || (m.from === "consumer" ? c.complainant : "You"),
              when: m.sentAt ? new Date(m.sentAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "",
              text: m.content
            })),
            history: (c.history || []).map((h: any) => ({
              title: h.toStatus ? h.toStatus.replace(/_/g, " ").toLowerCase() : "Update",
              when: h.createdAt ? new Date(h.createdAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "",
              iso: h.createdAt || new Date().toISOString(),
              text: h.publicNote
            })),
            evidence: (c.evidence || []).map((e: any) => ({
              name: e.name,
              note: e.type,
              size: `${Math.round((e.sizeBytes || 0) / 1024)} KB`,
              shared: true
            })),
          };
        }
      }
    }
  } catch {
    // fallback
  }

  if (reference !== "CC-2026-00123") return null;
  return buildBizCase((BIZ_STEPS as readonly string[]).includes(step ?? "") ? (step as BizStep) : "reply");
}

export const BIZ_LIST: BizSummary[] = [
  { reference: "CC-2026-00123", title: "Rice sold short and mixed with stones", alias: "Consumer 00123", status: { label: "Reply needed", tone: "warn" }, deadline: "Wed 4 Nov, 09:40", group: "reply", action: true, hasDetail: true },
  { reference: "CC-2026-00129", title: "Price above the official ceiling: sugar", alias: "Consumer 00129", status: { label: "With the officer", tone: "info" }, deadline: "No action needed", group: "officer" },
  { reference: "CC-2026-00127", title: "Underweight bag of sugar", alias: "Consumer 00127", status: { label: "Resolved", tone: "ok" }, deadline: "Closed Fri 30 Oct", group: "done" }
];
