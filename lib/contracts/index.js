// Shared, portable domain definitions. No secrets, no database clients, no server config.
// Source of truth: prototype/PLAN.md (Revision 3). Keep index.d.ts in step with this file.

/** The four places a complaint can be handled, in climbing order. The City Bureau is last. */
export const HANDLING_LEVELS = Object.freeze(["business", "woreda", "subcity", "bureau"]);

/** Five sign-ins. `prototype` is the folder holding that portal's screens. */
export const PORTALS = Object.freeze({
  consumer: { path: "/", prototype: "public" },
  business: { path: "/business", prototype: "merchant" },
  woreda: { path: "/woreda", prototype: "woreda" },
  subcity: { path: "/subcity", prototype: "subcity" },
  bureau: { path: "/bureau", prototype: "bureau" }
});

/** Roles shown in the prototype. `level` is the office level a government role works at. */
export const ROLES = Object.freeze({
  consumer: { portal: "consumer", level: null },
  business_owner: { portal: "business", level: "business" },
  woreda_officer: { portal: "woreda", level: "woreda" },
  woreda_admin: { portal: "woreda", level: "woreda" },
  subcity_coordinator: { portal: "subcity", level: "subcity" },
  bureau_officer: { portal: "bureau", level: "bureau" },
  bureau_admin: { portal: "bureau", level: "bureau" },
  content_admin: { portal: "bureau", level: "bureau" }
});

/** The 13 official complaint statuses (SRS 5.2). Consumer-facing wording lives in label catalogues. */
export const CASE_STATUSES = Object.freeze([
  "submitted", "under_initial_review", "information_required", "accepted", "assigned",
  "under_investigation", "awaiting_merchant_response", "under_reconciliation",
  "settlement_pending", "resolved", "escalated_referred", "outside_jurisdiction", "closed"
]);

/** Tip statuses. Proposed, awaiting institutional approval (SRS 4.3). */
export const TIP_STATUSES = Object.freeze([
  "received", "under_review", "follow_up_planned", "converted_to_case",
  "closed_action_taken", "closed_no_action"
]);

/** Complaint categories. Proposed, pending approval (CR-FR-008). Editable lists in production. */
export const COMPLAINT_CATEGORIES = Object.freeze([
  "misleading_commercial_practice", "defective_goods", "expired_products", "unsafe_products",
  "price_above_ceiling", "wrong_weight_measure", "service_complaint", "other"
]);

/** What a consumer or officer can ask for / propose in a negotiation or settlement. */
export const OFFER_TYPES = Object.freeze(["refund", "replacement", "repair", "other"]);

/** Conversations held in the Messages tab. */
export const CONVERSATION_KINDS = Object.freeze([
  "consumer_business", "consumer_government", "business_government", "government_government"
]);

export const LANGUAGES = Object.freeze(["en", "am"]);

/** CC-2026-00123 for complaints, TIP-2026-00045 for tips. CMP- belongs to AddisB2B stall reports. */
export const REFERENCE_PATTERNS = Object.freeze({
  complaint: /^CC-\d{4}-\d{5}$/,
  tip: /^TIP-\d{4}-\d{5}$/
});

export function formatReference(kind, year, sequence) {
  const prefix = kind === "complaint" ? "CC" : kind === "tip" ? "TIP" : null;
  if (!prefix) throw new Error(`Unknown reference kind: ${kind}`);
  if (!Number.isInteger(year) || year < 2000 || year > 9999) throw new Error("Invalid year.");
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 99999) throw new Error("Invalid sequence.");
  return `${prefix}-${year}-${String(sequence).padStart(5, "0")}`;
}

/** A complaint climbs one level at a time. Returns null at the last level. */
export function nextLevel(level) {
  const index = HANDLING_LEVELS.indexOf(level);
  if (index < 0) throw new Error(`Unknown handling level: ${level}`);
  return HANDLING_LEVELS[index + 1] ?? null;
}

/** True only for the single allowed move: from a level to the one directly above it. */
export function isValidClimb(from, to) {
  return nextLevel(from) === to && to !== null;
}

/** How a business sees a consumer: only a pseudonym, never name, phone or address. */
export function consumerAlias(sequence) {
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 99999) throw new Error("Invalid sequence.");
  return `Consumer ${String(sequence).padStart(5, "0")}`;
}
