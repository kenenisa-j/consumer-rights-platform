import type { CaseData, CaseSummary } from "@/types/case";
import { buildCase123, CASE_123_STEPS, type Case123Step } from "./case-123";

// Demo cases of the signed-in consumer (Hirut Alemu). All people and businesses are fictional.
const CASE_140: CaseData = {
  reference: "CC-2026-00140", title: "Electric kettle stopped working after three days", stage: "woreda",
  status: { label: "We need more information", tone: "warn" }, official: "Information Required", pending: "info_required",
  counterpart: "the officer",
  details: { problem: "Defective or substandard goods", business: "Kality Electronics (not on AddisB2B), Akaki Kality, Woreda 7",
    bought: "Electric kettle, 1.7 litre, on 31 October 2026", paid: "1,450 ETB", asked: "A replacement",
    narrative: "The kettle stopped heating on the third day. I took it back and the seller said it was my fault." },
  handledBy: [["Office", "Woreda 7 Trade Office, Akaki Kality"], ["Officer", "Dawit Kebede"]],
  banner: { tone: "plain", title: "The business is not on AddisB2B", text: "Your complaint came straight to your Woreda trade office." },
  infoRequest: { from: "Dawit Kebede, Woreda 7 Trade Office", when: "Thu 5 Nov, 09:40", deadline: "Tuesday 10 November 2026",
    text: "Thank you for your complaint. Please send the receipt, or another proof of where and when you bought the kettle, and a photo of the label under the kettle. Without it we cannot accept the complaint." },
  thread: [], evidence: [],
  updates: [
    { title: "We need more information", when: "Thursday 5 November 2026, 09:40", iso: "2026-11-05T09:40" },
    { title: "Being checked", when: "Thursday 5 November 2026, 09:10", iso: "2026-11-05T09:10" },
    { title: "Received", when: "Wednesday 4 November 2026, 18:20", iso: "2026-11-04T18:20" }
  ]
};

const CASE_118: CaseData = {
  reference: "CC-2026-00118", title: "Landlord kept my rent deposit", stage: "bureau",
  status: { label: "Not handled by this office", tone: "grey" }, official: "Outside Jurisdiction", pending: "outside",
  counterpart: "the officer",
  details: { problem: "Other", business: "Private landlord", bought: "Rent deposit", paid: "—", asked: "My deposit back",
    narrative: "My landlord did not return my deposit after I moved out." },
  handledBy: [["Office", "Addis Ababa Trade and Market Bureau"], ["Officer", "Yonas Girma"], ["On site", "Meron Tadesse, Woreda 7 Trade Office, Akaki Kality"]],
  outside: { from: "Dawit Kebede, Woreda 7 Trade Office", when: "Fri 30 Oct, 11:00",
    text: "Thank you for writing to us. A rent deposit between a tenant and a landlord is a housing matter, not a purchase of goods or services from a business. The Bureau cannot decide it.",
    alternatives: [
      { title: "Your Woreda administration office", text: "For housing and rent matters in your area", href: "/help#offices" },
      { title: "Free legal advice", text: "Legal aid centres can tell you if a court can help", href: "/help" }] },
  thread: [], evidence: [], closed: true,
  updates: [
    { title: "Not handled by this office", when: "Friday 30 October 2026, 11:00", iso: "2026-10-30T11:00" },
    { title: "Being checked", when: "Thursday 29 October 2026, 15:30", iso: "2026-10-29T15:30" },
    { title: "Received", when: "Thursday 29 October 2026, 08:10", iso: "2026-10-29T08:10" }
  ]
};

export async function getCase(reference: string, step?: string): Promise<CaseData | null> {
  try {
    const { cookies } = await import("next/headers");
    const { API_URL } = await import("@/lib/session");
    const jar = await cookies();
    if (jar.getAll().length > 0) {
      const res = await fetch(`${API_URL}/api/cases/${reference}`, {
        headers: { cookie: jar.toString() },
        cache: "no-store",
      });
      if (res.ok) {
        const body = await res.json();
        if (body?.case) return body.case as CaseData;
      }
    }
  } catch {
    // fallback
  }

  if (reference === "CC-2026-00123") {
    const s = (CASE_123_STEPS as readonly string[]).includes(step ?? "") ? (step as Case123Step) : "offer";
    return buildCase123(s);
  }
  if (reference === "CC-2026-00140") return CASE_140;
  if (reference === "CC-2026-00118") return CASE_118;
  return null;
}

export async function listCases(): Promise<{ attention: { reference: string; text: string }[]; cases: CaseSummary[] }> {
  try {
    const { cookies } = await import("next/headers");
    const { API_URL } = await import("@/lib/session");
    const jar = await cookies();
    if (jar.getAll().length > 0) {
      const res = await fetch(`${API_URL}/api/cases`, {
        headers: { cookie: jar.toString() },
        cache: "no-store",
      });
      if (res.ok) {
        const body = await res.json();
        const list = body?.cases;
        if (Array.isArray(list) && list.length > 0) {
          const attention: { reference: string; text: string }[] = [];
          const cases: CaseSummary[] = list.map((c: any) => {
            if (c.status === "BUSINESS_OFFER_PENDING") {
              attention.push({ reference: c.referenceNumber, text: "the business made you an offer. Accept it, answer it, or move it to the Woreda." });
            }
            const isOffer = c.status === "BUSINESS_OFFER_PENDING";
            const isResolved = c.status === "RESOLVED_MUTUALLY" || c.status === "RESOLVED_ADMINISTRATIVE_ORDER";
            return {
              reference: c.referenceNumber,
              title: c.itemDescription,
              business: c.merchant?.tradeName || c.unregisteredMerchantName || "Business",
              status: {
                label: isOffer ? "The business made you an offer" : isResolved ? "Resolved" : c.status.replace(/_/g, " ").toLowerCase(),
                tone: isOffer ? "warn" : isResolved ? "ok" : "info",
              },
              updated: new Date(c.updatedAt || c.createdAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
              href: `/cases/${c.referenceNumber}`,
            };
          });
          return { cases, attention };
        }
      }
    }
  } catch {
    // fallback
  }

  const a = buildCase123("offer");
  const cases: CaseSummary[] = [
    { reference: a.reference, title: a.title, business: "Gebriel Grain Traders", status: a.status, updated: "Tuesday 3 November", href: "/cases/CC-2026-00123" },
    { reference: CASE_140.reference, title: CASE_140.title, business: "Kality Electronics", status: CASE_140.status, updated: "Thursday 5 November", href: "/cases/CC-2026-00140" },
    { reference: CASE_118.reference, title: CASE_118.title, business: "Private landlord", status: CASE_118.status, updated: "Friday 30 October", href: "/cases/CC-2026-00118" }
  ];
  return { cases, attention: [
    { reference: "CC-2026-00123", text: "the business made you an offer. Accept it, answer it, or move it to the Woreda." },
    { reference: "CC-2026-00140", text: "the officer asks for your receipt." }] };
}

/** Demo account of the signed-in consumer. */
export const ME = { name: "Hirut Alemu", first: "Hirut", phone: "0900 000 412", email: "hirut.alemu@example.com",
  lives: "Akaki Kality, Woreda 7", identity: "Confirmed" } as const;
