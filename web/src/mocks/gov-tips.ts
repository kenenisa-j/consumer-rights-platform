import type { GovTip } from "@/features/gov/tip-state";
import type { GovLevel } from "@/types/gov";

// Tips seen by each level (prototype/{woreda,subcity,bureau}/tips.html, tip-00045.html). Anonymous: no sender, and
// the private code is never shown to staff. Demo data.
export interface TipRow { reference: string; title: string; where: string; source: string; status: string; group: string; hasDetail?: boolean }

export const TIP_TILES: Record<GovLevel, { value: string; label: string; alert?: boolean }[]> = {
  woreda: [{ value: "2", label: "New", alert: true }, { value: "1", label: "Under review" }, { value: "1", label: "From stall QR codes" }, { value: "14", label: "This quarter" }],
  subcity: [{ value: "2", label: "New", alert: true }, { value: "2", label: "With a Woreda" }, { value: "0", label: "From stall QR codes" }, { value: "31", label: "This quarter" }],
  bureau: [{ value: "3", label: "New", alert: true }, { value: "1", label: "Under review" }, { value: "1", label: "From stall QR codes" }, { value: "96", label: "This quarter" }]
};

export const TIP_INTRO: Record<GovLevel, string> = {
  woreda: "Market problems reported in Woreda 7. Kept apart from complaints.",
  subcity: "Market problems reported in Akaki Kality. Send each one to its Woreda, or act on it here.",
  bureau: "Market problems reported by people and by stall QR codes. Kept apart from complaints."
};

export const TIP_ROWS: Record<GovLevel, TipRow[]> = {
  woreda: [
    { reference: "TIP-2026-00045", title: "Sugar sold at 160 ETB, ceiling 125", where: "Near Market 097", source: "From a person", status: "Under review", group: "open", hasDetail: true },
    { reference: "TIP-2026-00049", title: "Expired milk at a kiosk", where: "Gelan road", source: "Office phone", status: "Received", group: "open" },
    { reference: "TIP-2026-00038", title: "False scale at a market stall", where: "Market 097", source: "Stall QR code", status: "Closed, action taken", group: "closed" }],
  subcity: [
    { reference: "TIP-2026-00045", title: "Sugar sold at 160 ETB, ceiling 125", where: "Woreda 7", source: "From a person", status: "With Woreda 7", group: "woreda", hasDetail: true },
    { reference: "TIP-2026-00050", title: "Cement sold above the list price", where: "Woreda 5", source: "From a person", status: "Received", group: "open" },
    { reference: "TIP-2026-00051", title: "Hidden stock of edible oil", where: "Woreda 11", source: "Free call", status: "Received", group: "open" },
    { reference: "TIP-2026-00049", title: "Expired milk at a kiosk", where: "Woreda 7", source: "Office phone", status: "With Woreda 7", group: "woreda" }],
  bureau: [
    { reference: "TIP-2026-00045", title: "Sugar sold at 160 ETB, ceiling 125", where: "Akaki Kality, Woreda 7", source: "From a person", status: "Under review", group: "open", hasDetail: true },
    { reference: "TIP-2026-00046", title: "Expired juice on a shelf", where: "Bole, Woreda 3", source: "From a person", status: "Received", group: "open" },
    { reference: "TIP-2026-00047", title: "Sugar above the price list (call)", where: "Kirkos, Woreda 4", source: "Free call", status: "Received", group: "open" },
    { reference: "TIP-2026-00041", title: "False scale at a market stall", where: "Yeka, Woreda 9", source: "Stall QR code", status: "Closed, action taken", group: "closed" }]
};

export const TIP_FILTERS: Record<GovLevel, { value: string; label: string }[]> = {
  woreda: [{ value: "all", label: "All" }, { value: "open", label: "Open" }, { value: "closed", label: "Closed" }],
  subcity: [{ value: "all", label: "All" }, { value: "open", label: "To send" }, { value: "woreda", label: "With a Woreda" }],
  bureau: [{ value: "all", label: "All" }, { value: "open", label: "Open" }, { value: "closed", label: "Closed" }]
};

/** TIP-2026-00045 as the given level sees it. */
export function TIP_45(level: GovLevel): GovTip {
  const holder = level === "woreda" ? "Woreda 7" : level === "subcity" ? "Woreda 7" : "Akaki Kality Sub-City";
  return {
    reference: "TIP-2026-00045", title: "Sugar sold above the ceiling", where: "A mini market near Market 097, Akaki Kality, Woreda 7",
    seen: "Wednesday 4 November 2026, around 17:00", what: "Sugar sold at 160 ETB per kg. The ceiling this week is 125 ETB.", source: "From a person",
    status: level === "subcity" ? "With Woreda 7" : "Under review", holder,
    history: [{ title: "Reviewed", when: "Thursday 5 November 2026, 09:30", iso: "2026-11-05T09:30", text: "Check the stall at the next Sunday Market visit." },
      { title: "Received", when: "Thursday 5 November 2026, 19:05", iso: "2026-11-05T19:05" }]
  };
}

export async function getTip(level: GovLevel, reference: string): Promise<GovTip | null> {
  try {
    const res = await fetch(`/api/government/tips/${reference}`, { credentials: "same-origin" });
    if (res.ok) {
      const body = await res.json();
      const t = body?.tip || body?.data?.tip || body?.data;
      if (t?.reference) return t;
    }
  } catch {
    // offline/mock fallback
  }
  return reference === "TIP-2026-00045" ? TIP_45(level) : null;
}
