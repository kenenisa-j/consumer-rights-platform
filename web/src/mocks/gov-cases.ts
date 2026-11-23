import type { UpdateEntry } from "@/types/case";
import type { GovCase, GovLevel, GovMessage, Rows } from "@/types/gov";

// Officer view of the demo cases. Government staff see the consumer's details; the business never does
// (prototype/docs/demo-data.md, Revision 3). All people and businesses are fictional.
const u = (title: string, when: string, iso: string, text?: string): UpdateEntry => ({ title, when, iso, text });

const COMPLAINT_123: Rows = [["Problem", "Wrong weight or measure"], ["Business", "Gebriel Grain Traders, Market 097 (on AddisB2B)"],
  ["Bought", "White rice, one 25 kg sack, Sunday 1 November 2026"], ["Paid", "2,250 ETB"], ["Consumer asks for", "A refund of 2,250 ETB"],
  ["Sent to the business", "Monday 2 November 2026, 09:40"]];
const HIRUT: Rows = [["Name", "Hirut Alemu"], ["Type", "Individual consumer"], ["Phone", "0900 000 412"], ["Email", "hirut.alemu@example.com"],
  ["Lives in", "Akaki Kality, Woreda 7"], ["Identity", "Confirmed"]];
const THREAD_123: GovMessage[] = [
  { who: "Gebriel Grain Traders", when: "Tue 3 Nov, 09:15", side: "business", text: "We are sorry. The sacks come from our supplier and we did not weigh each one. We offer a new 25 kg sack, weighed in front of the consumer." },
  { who: "Hirut Alemu", when: "Tue 3 Nov, 12:05", side: "consumer", text: "A new sack is not enough for me. I would like a refund of 2,250 ETB." },
  { who: "Gebriel Grain Traders", when: "Tue 3 Nov, 12:40", side: "business", text: "We stand by our offer of a new sack." }];
const EVIDENCE = [
  { name: "receipt-rice.jpg", note: "Receipt from Gebriel Grain Traders", size: "240 KB", shared: true },
  { name: "sack-on-scale.jpg", note: "The sack on a scale showing 21 kg", size: "1.1 MB", shared: true },
  { name: "stones-in-rice.jpg", note: "Stones found in the rice", size: "870 KB", shared: true }];

const H_WOREDA: UpdateEntry[] = [
  u("Visit to the stall", "Thursday 5 November 2026, 11:30", "2026-11-05T11:30", "Three of four sacks were 21 to 22 kg."),
  u("Accepted by the Woreda", "Wednesday 4 November 2026, 10:05", "2026-11-04T10:05", "Officer Meron Tadesse."),
  u("Consumer moved it to the Woreda", "Wednesday 4 November 2026, 08:30", "2026-11-04T08:30", "The business only offered a new sack."),
  u("Sent to the business", "Monday 2 November 2026, 09:40", "2026-11-02T09:40", "Complaint submitted online.")];
const H_SUBCITY: UpdateEntry[] = [
  u("Accepted by the Sub-City", "Monday 9 November 2026, 09:20", "2026-11-09T09:20", "Officer Tsehay Bekele."),
  u("Passed up by the Woreda", "Friday 6 November 2026, 11:30", "2026-11-06T11:30", "Not resolved at Woreda 7. Meeting at 10:00 had no agreement. Visit findings attached.")];
const H_BUREAU: UpdateEntry[] = [
  u("Accepted by the City Bureau", "Tuesday 10 November 2026, 09:00", "2026-11-10T09:00", "Officer Yonas Girma."),
  u("Passed up by the Sub-City", "Monday 9 November 2026, 16:30", "2026-11-09T16:30", "Not resolved at the Sub-City. Meeting at 14:00 had no agreement.")];

const HAND_WOREDA = { title: "Not resolved at the Woreda", from: "Meron Tadesse, Woreda 7", when: "Friday 6 November 2026, 11:30", text: "Not resolved at Woreda 7. Meeting at 10:00 had no agreement. Visit findings attached." };
const HAND_SUBCITY = { title: "Not resolved at the Sub-City", from: "Tsehay Bekele, Akaki Kality Sub-City", when: "Monday 9 November 2026, 16:30", text: "Not resolved at the Sub-City. Meeting at 14:00 had no agreement." };

function case123(level: GovLevel): GovCase {
  const common = { reference: "CC-2026-00123", title: "Rice sold short and mixed with stones", accepted: true, onPlatform: true,
    complaint: COMPLAINT_123, consumer: HIRUT, thread: THREAD_123, evidence: EVIDENCE };
  if (level === "woreda") return { ...common, heldBy: "woreda", officer: "Meron Tadesse", passedThrough: [], handovers: [],
    status: { label: "Meeting held, not resolved", tone: "warn" }, official: "Under Reconciliation",
    reached: { title: "Moved up from the business", text: "The consumer and the business could not agree, so the consumer moved the complaint to your Woreda on Wednesday 4 November, 08:30. You accepted it and visited the stall on Thursday." },
    history: H_WOREDA };
  if (level === "subcity") return { ...common, heldBy: "subcity", officer: "Tsehay Bekele", passedThrough: ["woreda"], handovers: [HAND_WOREDA],
    status: { label: "Meeting today at 14:00", tone: "info" }, official: "Escalated / Referred",
    reached: { title: "Passed up by Woreda 7", text: "Woreda 7 could not resolve it and passed it up on Friday 6 November, 11:30, with a handover note and the visit findings." },
    history: [...H_SUBCITY, ...H_WOREDA], meeting: "2026-11-09 14:00, Akaki Kality Sub-City office" };
  return { ...common, heldBy: "bureau", officer: "Yonas Girma", passedThrough: ["woreda", "subcity"], handovers: [HAND_SUBCITY, HAND_WOREDA],
    status: { label: "Last level: settle or refer", tone: "warn" }, official: "Escalated / Referred",
    reached: { title: "Passed up by the Sub-City: last level", text: "Not resolved at the Woreda or the Sub-City. You are the last level: settle it, or refer it for further action." },
    history: [...H_BUREAU, ...H_SUBCITY, ...H_WOREDA] };
}

const CASE_140: GovCase = {
  reference: "CC-2026-00140", title: "Electric kettle stopped working after three days", heldBy: "woreda", accepted: true, officer: "Dawit Kebede",
  status: { label: "Information received", tone: "info" }, official: "Under Initial Review", onPlatform: false, passedThrough: [], handovers: [],
  reached: { title: "Straight to the Woreda", text: "The business is not on AddisB2B, so the complaint came straight to your Woreda trade office." },
  complaint: [["Problem", "Defective or substandard goods"], ["Business", "Kality Electronics (not on AddisB2B), Akaki Kality, Woreda 7"],
    ["Bought", "Electric kettle, 1.7 litre, 31 October 2026"], ["Paid", "1,450 ETB"], ["Consumer asks for", "A replacement"]],
  consumer: HIRUT,
  thread: [{ who: "Hirut Alemu", when: "Fri 6 Nov, 08:55", side: "consumer", text: "I found the receipt. The label photo is attached as well." },
    { who: "Dawit Kebede", when: "Thu 5 Nov, 09:40", side: "office", text: "Please send the receipt and a photo of the label under the kettle." }],
  evidence: [{ name: "receipt-kettle.jpg", note: "Receipt", size: "310 KB", shared: false }, { name: "kettle-label.jpg", note: "Label under the kettle", size: "420 KB", shared: false }],
  history: [u("Information received", "Friday 6 November 2026, 08:55", "2026-11-06T08:55", "Receipt and label photo."),
    u("Information requested", "Thursday 5 November 2026, 09:40", "2026-11-05T09:40", "Receipt and label photo."),
    u("Accepted by the Woreda", "Thursday 5 November 2026, 09:10", "2026-11-05T09:10", "Officer Dawit Kebede."),
    u("Received", "Wednesday 4 November 2026, 18:20", "2026-11-04T18:20", "Complaint submitted online.")]
};

const CASE_146: GovCase = {
  reference: "CC-2026-00146", title: "Short weight at Market 097", heldBy: "woreda", accepted: false,
  status: { label: "New: accept it", tone: "warn" }, official: "Submitted", onPlatform: false, passedThrough: [], handovers: [],
  reached: { title: "Free call line", text: "The City Bureau took this call on the free line and passed it to your Woreda." },
  complaint: [["Problem", "Wrong weight or measure"], ["Business", "Unknown stall, Market 097"], ["What was said", "Two kilos of teff weighed 1.6 kg on the buyer's own scale."], ["Consumer asks for", "The stall to be checked"]],
  consumer: [["Name", "Caller, recorded by the free line"], ["Phone", "0900 000 099"], ["Lives in", "Akaki Kality, Woreda 7"], ["Identity", "Not confirmed"]],
  thread: [], evidence: [],
  history: [u("Recorded on the free call line", "Thursday 12 November 2026, 08:50", "2026-11-12T08:50", "Passed to Woreda 7.")]
};

function mapBackendGovCase(c: any, level: GovLevel): GovCase {
  const heldBy: GovLevel =
    c.office?.level === "CITY_BUREAU" ? "bureau" :
    c.office?.level === "SUBCITY" ? "subcity" : "woreda";

  const isAccepted = c.status !== "ESCALATED_TO_GOVERNMENT" && c.status !== "RECEIVED_BY_OFFICE";
  const isClosed = [
    "RESOLVED_MUTUALLY",
    "RESOLVED_ADMINISTRATIVE_ORDER",
    "COURT_REFERRAL_ISSUED",
    "CLOSED_OUTSIDE_JURISDICTION",
    "CLOSED_WITHDRAWN",
  ].includes(c.status);

  const passedThrough: GovLevel[] = [];
  if (c.transfers && c.transfers.length > 0) {
    for (const t of c.transfers) {
      if (t.fromOffice?.level === "WOREDA" && !passedThrough.includes("woreda")) passedThrough.push("woreda");
      if (t.fromOffice?.level === "SUBCITY" && !passedThrough.includes("subcity")) passedThrough.push("subcity");
    }
  }

  const handovers = (c.transfers || []).map((t: any) => ({
    title: t.direction ? t.direction.replace(/_/g, " ") : "Transfer",
    from: t.fromOffice?.nameEn || "Lower office",
    when: t.transferredAt ? new Date(t.transferredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "",
    text: t.handoverNote || t.reason || "",
  }));

  const complaint: Rows = [
    ["Problem", c.category?.nameEn || c.category?.name || "Problem"],
    ["Business", c.merchant?.tradeName || c.unregisteredMerchantName || "Business"],
    ["Bought", c.incidentDate ? new Date(c.incidentDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—"],
    ["Paid", `${c.disputedAmount} ${c.currency || "ETB"}`],
    ["Consumer asks for", c.desiredRemedy || "Remedy"],
    ["Route", c.route ? c.route.replace(/_/g, " ") : "Standard"],
  ];

  const consumer: Rows = [
    ["Complainant", c.complainantAlias || "Consumer"],
    ["Office", c.office?.nameEn || "Assigned Office"],
    ["Status", c.status.replace(/_/g, " ")],
  ];

  const evidence = (c.evidence || []).map((e: any) => ({
    name: e.fileName || e.name || "document",
    note: e.fileType || e.note || "File",
    size: e.fileSizeBytes ? `${Math.round(e.fileSizeBytes / 1024)} KB` : (e.size || "100 KB"),
    shared: !e.isOfficerOnly,
  }));

  const history = (c.history || []).map((h: any) => ({
    title: h.toStatus ? h.toStatus.replace(/_/g, " ") : "Update",
    when: h.createdAt ? new Date(h.createdAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "",
    iso: h.createdAt || new Date().toISOString(),
    text: h.note || h.publicNote || "",
  }));

  return {
    reference: c.reference,
    title: c.itemDescription || c.title || "Complaint",
    heldBy,
    accepted: isAccepted,
    officer: c.activeAssignment?.assignedTo?.fullName || c.officer,
    status: {
      label: isAccepted ? (isClosed ? "Resolved" : "In progress") : "New: accept it",
      tone: isClosed ? "ok" : isAccepted ? "info" : "warn",
    },
    official: c.status.replace(/_/g, " "),
    onPlatform: c.route === "REGISTERED_BUSINESS",
    passedThrough,
    resolvedAt: isClosed ? heldBy : undefined,
    closed: isClosed,
    reached: {
      title: isAccepted ? `With the ${heldBy === "bureau" ? "City Bureau" : heldBy === "subcity" ? "Sub-City" : "Woreda"}` : "Needs acceptance",
      text: `Complaint held by ${c.office?.nameEn || "trade office"}.`,
    },
    handovers,
    complaint,
    consumer,
    thread: [],
    evidence,
    history,
  };
}

export async function getGovCase(level: GovLevel, reference: string): Promise<GovCase | null> {
  try {
    const { cookies } = await import("next/headers");
    const { API_URL } = await import("@/lib/session");
    const jar = await cookies();
    if (jar.getAll().length > 0) {
      const res = await fetch(`${API_URL}/api/government/cases/${reference}`, {
        headers: { cookie: jar.toString() },
        cache: "no-store",
      });
      if (res.ok) {
        const body = await res.json();
        const c = body?.complaint;
        if (c) {
          return mapBackendGovCase(c, level);
        }
      }
    }
  } catch {
    // offline/mock fallback
  }

  if (reference === "CC-2026-00123") return case123(level);
  if (level === "woreda" && reference === "CC-2026-00140") return CASE_140;
  if (level === "woreda" && reference === "CC-2026-00146") return CASE_146;
  return null;
}
