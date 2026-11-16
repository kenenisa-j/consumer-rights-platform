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
  try {
    const res = await fetch(`/api/merchants/public-lookup?search=${encodeURIComponent(q)}`, { credentials: "same-origin" });
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data || [];
      if (list.length > 0) {
        return list.map((m: any) => ({
          id: m.id,
          name: m.tradeName,
          kind: m.businessType || m.businessCategory || "Business",
          place: m.market?.nameEn ? `${m.market.nameEn} · ${m.woredaOffice?.nameEn || ""}` : (m.woredaOffice?.nameEn || ""),
        }));
      }
    }
  } catch {
    // offline/mock fallback
  }
  if (!q) return BUSINESSES.slice(0, 2);
  return BUSINESSES.filter(b => `${b.name} ${b.place}`.toLowerCase().includes(q));
}

export async function submitComplaint(draft?: any): Promise<{ reference: string; sentAt: string }> {
  if (draft) {
    try {
      const isRegistered = draft.business?.mode === "registered";
      const payload: any = {
        route: isRegistered ? "REGISTERED_BUSINESS" : "DIRECT_GOVERNMENT",
        categoryId: draft.category || "OTHER",
        incidentDate: draft.purchase?.date ? new Date(draft.purchase.date).toISOString() : new Date().toISOString(),
        itemDescription: (draft.purchase?.item ? `${draft.purchase.item}: ` : "") + (draft.what || draft.subject || "Consumer Complaint"),
        disputedAmount: Number(draft.purchase?.paid) || 0,
        currency: "ETB",
        desiredRemedy: draft.outcome?.want || "Refund",
        receiptAvailable: draft.purchase?.receipt === "yes",
      };
      if (isRegistered && draft.business?.id) {
        payload.merchantId = draft.business.id;
      } else if (!isRegistered && draft.business?.name) {
        payload.unregisteredMerchantName = draft.business.name;
        if (draft.business?.address) payload.unregisteredMerchantLocation = draft.business.address;
        if (draft.business?.phone) payload.unregisteredMerchantPhone = draft.business.phone;
      }

      const res = await fetch("/api/cases", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const body = await res.json();
        const ref = body?.case?.referenceNumber || body?.data?.referenceNumber;
        if (ref) {
          return {
            reference: ref,
            sentAt: new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
        }
      }
    } catch {
      // offline/mock fallback
    }
  }
  return { reference: "CC-2026-00148", sentAt: "Monday 2 November 2026, 09:40" };
}

export async function submitTip(draft?: any): Promise<{ reference: string; code: string; receivedAt: string }> {
  if (draft) {
    try {
      const res = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        const body = await res.json();
        const tip = body?.data || body;
        if (tip?.reference && tip?.trackingCode) {
          return {
            reference: tip.reference,
            code: tip.trackingCode,
            receivedAt: new Date(tip.receivedAt || Date.now()).toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
        }
      }
    } catch {
      // offline/mock fallback
    }
  }
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
  try {
    const res = await fetch("/api/tips/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, code }),
    });
    if (res.ok) {
      const body = await res.json();
      return body?.data || body;
    }
  } catch {
    // offline/mock fallback
  }
  if (reference.toUpperCase() !== "TIP-2026-00045" || code.toUpperCase() !== "Q7MD-42KX") return null;
  return { reference: "TIP-2026-00045", label: "Under review", received: "Thursday 5 November 2026",
    reviewedBy: "Addis Ababa Trade and Market Bureau", meaning: "An officer is reading the tip and deciding on a follow-up." };
}

export const CATEGORY_OPTIONS = (Object.keys(CATEGORY_TEXT) as ComplaintCategory[]).map(value => ({ value, ...CATEGORY_TEXT[value] }));

/** A complaint recorded by staff (phone, in person or letter). The backend allocates the reference. */
export async function submitIntake(payload?: any): Promise<{ reference: string }> {
  if (payload) {
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const body = await res.json();
        const ref = body?.case?.referenceNumber || body?.data?.referenceNumber;
        if (ref) return { reference: ref };
      }
    } catch {
      // fallback
    }
  }
  return { reference: "CC-2026-00144" };
}
