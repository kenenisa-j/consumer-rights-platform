import type { CaseData, ThreadMessage, UpdateEntry } from "@/types/case";

// Demo story CC-2026-00123 (prototype/docs/demo-data.md). `step` shows the case as it stands at that
// point of its climb, so every consumer-facing state can be seen without inventing more cases.
export const CASE_123_STEPS = ["offer", "improved", "meeting", "subcity", "settlement", "resolved"] as const;
export type Case123Step = (typeof CASE_123_STEPS)[number];

const TEXT = "On Sunday 1 November I bought a 25 kg sack of white rice. At home it weighed 21 kg, and there were small stones in it. I went back the same day. The seller said the sacks come like that from the supplier and would not change it.";
const GG = "Gebriel Grain Traders";
const W7 = "Meron Tadesse, Woreda 7 Trade Office";
const u = (title: string, when: string, iso: string, text?: string): UpdateEntry => ({ title, when, iso, text });
const m = (id: string, from: ThreadMessage["from"], who: string, when: string, text: string): ThreadMessage => ({ id, from, who, when, text });

const BASE_UPDATES = [
  u("Sent to the business", "Monday 2 November, 09:40 2026", "2026-11-02T09:40", `Your complaint was sent to ${GG}.`),
  u("The business replied", "Tuesday 3 November, 09:15 2026", "2026-11-03T09:15", "The business offered a new 25 kg sack.")
];
const CLIMB: Record<string, UpdateEntry[]> = {
  meeting: [
    u("You moved it to the Woreda", "Wednesday 4 November, 08:30 2026", "2026-11-04T08:30", "You did not agree with the offer and moved the complaint to the Woreda 7 Trade Office."),
    u("Accepted by the Woreda", "Wednesday 4 November, 10:05 2026", "2026-11-04T10:05", "Officer Meron Tadesse is handling your case."),
    u("Visit to the stall", "Thursday 5 November, 11:30 2026", "2026-11-05T11:30", "The officer weighed four sacks from the same supplier."),
    u("Meeting to agree a solution", "Thursday 5 November, 15:00 2026", "2026-11-05T15:00", "Meeting set for Friday 6 November, 10:00, at the Woreda 7 Trade Office.")
  ],
  subcity: [
    u("Not resolved at the Woreda", "Friday 6 November, 11:30 2026", "2026-11-06T11:30", "The business would not agree to a refund. The complaint was passed to Akaki Kality Sub-City."),
    u("Accepted by the Sub-City", "Monday 9 November, 09:20 2026", "2026-11-09T09:20", "Officer Tsehay Bekele is handling your case. Meeting at 14:00.")
  ],
  settlement: [
    u("Not resolved at the Sub-City", "Monday 9 November, 16:30 2026", "2026-11-09T16:30", "The complaint was passed to the Addis Ababa City Bureau, the last level."),
    u("Accepted by the City Bureau", "Tuesday 10 November, 09:00 2026", "2026-11-10T09:00", "Officer Yonas Girma is handling your case."),
    u("Solution proposed", "Wednesday 11 November, 11:10 2026", "2026-11-11T11:10", "Refund of 2,250 ETB by Thursday 12 November, 12:00.")
  ],
  resolved: [
    u("Refund paid", "Thursday 12 November, 09:30 2026", "2026-11-12T09:30", "2,250 ETB paid in cash at the City Bureau office."),
    u("Resolved", "Thursday 12 November, 09:45 2026", "2026-11-12T09:45", "The case is resolved. It closes on Monday 16 November.")
  ]
};
const ORDER = ["meeting", "subcity", "settlement", "resolved"];

const EVIDENCE = [
  { name: "receipt-rice.jpg", note: `Receipt from ${GG}`, size: "240 KB", shared: true },
  { name: "sack-on-scale.jpg", note: "The sack on a scale showing 21 kg", size: "1.1 MB", shared: true },
  { name: "stones-in-rice.jpg", note: "Stones found in the rice", size: "870 KB", shared: true }
];

const OPENING = m("b0", "me", "You", "Mon 2 Nov, 09:40", "Your complaint: wrong weight. The sack weighed 21 kg and had small stones in it. I ask for my money back, 2,250 ETB.");
const SORRY = m("b1", "business", GG, "Tue 3 Nov, 09:15", "We are sorry. The sacks come from our supplier and we did not weigh each one. We offer you a new 25 kg sack, weighed in front of you.");
const WOREDA_MSGS = [
  m("w3", "office", W7, "Thu 5 Nov, 15:00", "The business has said it can only offer a new sack. Can you come to our office on Friday 6 November at 10:00 so we can try to agree a solution together?"),
  m("w2", "office", W7, "Thu 5 Nov, 11:30", "I visited the stall today and weighed four sacks from the same supplier. Three were between 21 and 22 kg."),
  m("w1", "office", W7, "Wed 4 Nov, 10:05", "I have accepted your complaint. I will visit the stall tomorrow."),
  m("w0", "me", "You", "Wed 4 Nov, 08:30", "I moved the complaint to the Woreda because the business only offers a new sack and I want my money back.")
];

const DETAILS = {
  problem: "Wrong weight or measure", business: `${GG}, Market 097`,
  bought: "White rice, one 25 kg sack, on 1 November 2026", paid: "2,250 ETB", asked: "Your money back: 2,250 ETB", narrative: TEXT
};

export function buildCase123(step: Case123Step): CaseData {
  const reached = step === "offer" || step === "improved" ? -1 : ORDER.indexOf(step);
  const updates: UpdateEntry[] = [...BASE_UPDATES];
  if (step === "improved") updates.push(u("The business improved its offer", "Tuesday 3 November, 14:30 2026", "2026-11-03T14:30", "A full refund of 2,250 ETB, paid in cash within 2 days."));
  for (let i = 0; i <= reached; i++) updates.push(...CLIMB[ORDER[i]]);

  const base: CaseData = {
    reference: "CC-2026-00123", title: "Rice sold short and mixed with stones", stage: "business",
    status: { label: "The business made you an offer", tone: "warn" }, official: "Sent to the business",
    pending: "business_offer", counterpart: GG, details: DETAILS, evidence: EVIDENCE,
    handledBy: [["Business", `${GG}, Market 097`], ["Woreda office", "Not yet involved"]],
    thread: [SORRY, OPENING], updates: [],
    offer: { title: `${GG} made you an offer`, text: "A new 25 kg sack, weighed in front of you. You asked for a refund of 2,250 ETB. You can accept the offer, reply, or move it to the Woreda." }
  };

  const view: CaseData = { ...base, updates: updates.reverse() };
  if (step === "improved") return { ...view, pending: "business_refund", status: { label: "The business improved its offer", tone: "warn" },
    offer: { title: `${GG} improved its offer`, text: "A full refund of 2,250 ETB, paid in cash within 2 days. This is what you asked for. If you accept, the complaint is resolved." },
    thread: [m("b3", "business", GG, "Tue 3 Nov, 14:30", "Understood. We will refund the full 2,250 ETB in cash within 2 days, and we will weigh sacks before selling them."),
      m("b2", "me", "You", "Tue 3 Nov, 12:05", "A new sack is not enough for me. I would like a refund of 2,250 ETB."), SORRY, OPENING] };
  if (reached < 0) return view;

  const climb: Partial<CaseData> = { offer: undefined, thread: WOREDA_MSGS, counterpart: "the officer" };
  if (step === "meeting") return { ...view, ...climb, stage: "woreda", pending: "meeting", official: "Under Reconciliation",
    status: { label: "Meeting at the Woreda", tone: "info" },
    handledBy: [["Office", "Woreda 7 Trade Office, Akaki Kality"], ["Officer", "Meron Tadesse"]],
    meeting: { title: "Meeting with the business: Friday 6 November 2026, 10:00",
      text: "At the Woreda 7 Trade Office, Akaki Kality. The officer will help you and Gebriel Grain Traders agree a solution. Bring your receipt." } };
  if (step === "subcity") return { ...view, ...climb, stage: "subcity", pending: "meeting", official: "Escalated / Referred",
    status: { label: "Meeting at the Sub-City", tone: "info" },
    handledBy: [["Office", "Akaki Kality Sub-City"], ["Officer", "Tsehay Bekele"], ["Earlier", "Woreda 7"]],
    meeting: { title: "Meeting with the business: Monday 9 November 2026, 14:00", text: "At the Akaki Kality Sub-City office. Bring your receipt." },
    banner: { tone: "plain", title: "Not resolved at the Woreda. Your complaint is now with the Sub-City.", text: "Officer Tsehay Bekele accepted it on Monday 9 November." } };
  const bureau: Partial<CaseData> = { ...climb, stage: "bureau", handledBy: [["Office", "Addis Ababa City Bureau"], ["Officer", "Yonas Girma"], ["Earlier", "Woreda 7, then Akaki Kality Sub-City"]] };
  if (step === "settlement") return { ...view, ...bureau, pending: "settlement", official: "Settlement Pending",
    status: { label: "A solution is proposed: your answer is needed", tone: "warn" },
    banner: { tone: "plain", title: "Not resolved at the Sub-City. Your complaint is now with the City Bureau, the last level.", text: "Officer Yonas Girma accepted it on Tuesday 10 November and held a meeting on Wednesday 11 November." },
    settlement: [["The business will", "Refund 2,250 ETB to you"], ["How", "In cash, at the City Bureau office, in front of the officer"],
      ["By", "Thursday 12 November 2026, 12:00"], ["Also agreed", "Gebriel Grain Traders will weigh every sack before selling it"], ["Proposed by", "Yonas Girma, Addis Ababa City Bureau"]] };
  return { ...view, ...bureau, pending: "none", official: "Resolved", closed: true, status: { label: "Resolved: refund paid", tone: "ok" }, stage: "resolved",
    banner: { tone: "ok", title: "Your refund of 2,250 ETB was paid on Thursday 12 November.", text: "The case is resolved and closes on Monday 16 November." } };
}
