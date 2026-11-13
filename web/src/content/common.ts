import type { ComplaintCategory, HandlingLevel } from "@consumer-rights/contracts";
import { bi, type Bilingual } from "./types";

export const SUB_CITIES = ["Addis Ketema", "Akaki Kality", "Arada", "Bole", "Gulele", "Kirkos",
  "Kolfe Keranio", "Lemi Kura", "Lideta", "Nifas Silk-Lafto", "Yeka"] as const;

/** Wording for the complaint categories (proposed, pending approval: CR-FR-008). */
export const CATEGORY_TEXT: Record<ComplaintCategory, { title: string; text: string }> = {
  misleading_commercial_practice: { title: "Misleading commercial practice", text: "False claims, hidden costs, fake discounts" },
  defective_goods: { title: "Defective or substandard goods", text: "Does not work, breaks early, poor quality" },
  expired_products: { title: "Expired products", text: "Sold after the expiry date" },
  unsafe_products: { title: "Unsafe products", text: "Could harm health or safety" },
  price_above_ceiling: { title: "Price above the official ceiling", text: "Charged more than the set price" },
  wrong_weight_measure: { title: "Wrong weight or measure", text: "Less than you paid for, false scales" },
  service_complaint: { title: "Service complaint", text: "A paid service not done or done badly" },
  other: { title: "Other", text: "Something else about a purchase" }
};

/** The five stops of the climb shown on every case: four levels, then resolved. */
export const STAGES: readonly Bilingual[] = [
  bi("With the business", "ከድርጅቱ ጋር"), bi("Woreda office", "ወረዳ"),
  bi("Sub-City office", "ክፍለ ከተማ"), bi("City Bureau", "ከተማ ቢሮ"), bi("Resolved", "ተፈትቷል")
];

export const STAGE_INDEX: Record<HandlingLevel | "resolved", number> = {
  business: 0, woreda: 1, subcity: 2, bureau: 3, resolved: 4
};

export const OFFER_LABELS = { refund: "Refund", replacement: "Replacement", repair: "Repair", other: "Something else" } as const;
