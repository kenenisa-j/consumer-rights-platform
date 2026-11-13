import { CATEGORY_TEXT } from "@/content/common";
import type { ComplaintCategory } from "@consumer-rights/contracts";

export interface BusinessHit { id: string; name: string; kind: string; place: string }

/** Registered businesses (AddisB2B). Replaced by the BusinessDirectory adapter (ADR-0002). */
const BUSINESSES: readonly BusinessHit[] = [
  { id: "gebriel-grain", name: "Gebriel Grain Traders", kind: "Market trader", place: "Market 097, ቃሊቲ ገብርኤል · Akaki Kality, Woreda 7" },
  { id: "gebriel-mini", name: "Gebriel Mini Shop", kind: "Market trader", place: "Bole, Woreda 3" },
  { id: "kality-minimarket", name: "Kality Mini Market", kind: "Shop", place: "Akaki Kality, Woreda 7" },
  { id: "lideta-electronics", name: "Lideta Electronics", kind: "Shop", place: "Lideta, Woreda 5" }
];

export async function findBusinesses(query: string): Promise<BusinessHit[]> {
  const q = query.trim().toLowerCase();
  if (!q) return BUSINESSES.slice(0, 2);
  return BUSINESSES.filter(b => `${b.name} ${b.place}`.toLowerCase().includes(q));
}

export async function submitComplaint(): Promise<{ reference: string; sentAt: string }> {
  return { reference: "CC-2026-00148", sentAt: "Monday 2 November 2026, 09:40" };
}

export async function submitTip(): Promise<{ reference: string; code: string; receivedAt: string }> {
  return { reference: "TIP-2026-00048", code: "Q7MD-42KX", receivedAt: "Thursday 5 November 2026, 19:05" };
}

const TRACKED: Record<string, { stage: number; label: string; handledBy: string; updated: string; next: string; official: string }> = {
  "CC-2026-00123": { stage: 1, label: "Meeting to agree a solution", handledBy: "Woreda 7 Trade Office, Akaki Kality",
    updated: "Thursday 5 November 2026, 15:00", next: "Meeting with the business on Friday 6 November, 10:00", official: "Under Reconciliation" },
  "CC-2026-00140": { stage: 1, label: "We need more information", handledBy: "Woreda 7 Trade Office, Akaki Kality",
    updated: "Thursday 5 November 2026, 09:40", next: "Send the receipt by Tuesday 10 November", official: "Information Required" }
};

export type TrackComplaint =
  | { found: true; reference: string; stage: number; label: string; handledBy: string; updated: string; next: string; official: string }
  | { found: false; reason: "not_found" | "phone_mismatch" };

/** The last 4 digits stop strangers reading a status by guessing numbers. Demo digits: 0412. */
export async function trackComplaint(reference: string, phone4: string): Promise<TrackComplaint> {
  const hit = TRACKED[reference.toUpperCase()];
  if (!hit) return { found: false, reason: "not_found" };
  if (phone4 !== "0412") return { found: false, reason: "phone_mismatch" };
  return { found: true, reference: reference.toUpperCase(), ...hit };
}

export async function trackTip(reference: string, code: string) {
  if (reference.toUpperCase() !== "TIP-2026-00045" || code.toUpperCase() !== "Q7MD-42KX") return null;
  return { reference: "TIP-2026-00045", label: "Under review", received: "Thursday 5 November 2026",
    reviewedBy: "Addis Ababa Trade and Market Bureau", meaning: "An officer is reading the tip and deciding on a follow-up." };
}

export const CATEGORY_OPTIONS = (Object.keys(CATEGORY_TEXT) as ComplaintCategory[]).map(value => ({ value, ...CATEGORY_TEXT[value] }));

/** A complaint recorded by staff (phone, in person or letter). The backend allocates the reference. */
export async function submitIntake(): Promise<{ reference: string }> {
  return { reference: "CC-2026-00144" };
}
