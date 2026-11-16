import type { ComplaintCategory } from "@consumer-rights/contracts";

// The complaint form's data. Kept in sessionStorage between steps so a refresh or the Back button never loses
// typing. Files are NOT stored (browsers cannot keep File objects); the wizard asks again if the page was reloaded.
export const STEP_COUNT = 6;
export const STEP_NAMES = ["What happened", "The business", "Your purchase", "Evidence", "What you want", "Check and send"] as const;
const KEY = "cr:complaint-draft";

export interface Draft {
  reached: number; // highest step the person has completed + 1
  category: ComplaintCategory | "";
  subject: string; what: string; urgent: boolean;
  business: { mode: "registered" | "other" | ""; id: string; name: string; place: string; subcity: string; woreda: string; address: string; phone: string };
  purchase: { item: string; date: string; where: string; subcity: string; woreda: string; place: string; paid: string; loss: string; receipt: string };
  fileNames: { name: string; size: number; shared: boolean }[];
  outcome: { want: string; amount: string; note: string; phone: string; email: string; lang: string; byEmail: boolean; bySms: boolean };
  truth: boolean;
  /** Where the complaint is sent. The default is the City Bureau, the last level, which can see everything. */
  destination: Destination;
  /** The Sub-City and Woreda chosen for "send it to this office". Chosen in the last step, not taken from where it was bought. */
  destSubcity: string; destWoreda: string;
}

export type Destination = "business" | "woreda" | "subcity" | "bureau";

export const emptyDraft = (phone = "", email = "", lang = "en"): Draft => ({
  reached: 1, category: "", subject: "", what: "", urgent: false,
  business: { mode: "", id: "", name: "", place: "", subcity: "", woreda: "", address: "", phone: "" },
  purchase: { item: "", date: "", where: "", subcity: "", woreda: "", place: "", paid: "", loss: "", receipt: "" },
  fileNames: [],
  outcome: { want: "", amount: "", note: "", phone, email, lang, byEmail: false, bySms: false },
  truth: false, destination: "bureau", destSubcity: "", destWoreda: ""
});

export function loadDraft(fallback: Draft): Draft {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<Draft>) } : fallback;
  } catch { return fallback; }
}
export function saveDraft(d: Draft): void { try { sessionStorage.setItem(KEY, JSON.stringify(d)); } catch { /* private mode */ } }
export function clearDraft(): void { try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } }

export const WANT_LABEL: Record<string, string> = {
  refund: "My money back", replacement: "A replacement", repair: "A repair", loss: "Payment for my loss", other: "Something else"
};
/** For these outcomes the person must name an amount. */
export const needsAmount = (want: string) => want === "refund" || want === "loss";

export function summary(d: Draft, categoryTitle: (c: string) => string): { label: string; value: string | null }[] {
  const p = d.purchase;
  return [
    { label: "What happened", value: d.category ? `${categoryTitle(d.category)}${d.subject ? ` · ${d.subject}` : ""}` : null },
    { label: "The business", value: d.business.name || null },
    { label: "Your purchase", value: p.item ? `${p.item}${p.date ? ` · ${p.date}` : ""}${p.paid ? ` · ${Number(p.paid).toLocaleString("en")} ETB` : ""}` : null },
    { label: "Evidence", value: d.fileNames.length ? `${d.fileNames.length} file${d.fileNames.length === 1 ? "" : "s"}` : d.reached > 4 ? "None added" : null },
    { label: "What you want", value: d.outcome.want ? `${WANT_LABEL[d.outcome.want]}${d.outcome.amount && needsAmount(d.outcome.want) ? `: ${Number(d.outcome.amount).toLocaleString("en")} ETB` : ""}` : null }
  ];
}
