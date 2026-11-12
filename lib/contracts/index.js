// Shared, portable domain definitions. No secrets, no database clients, no server config.
// Source of truth: prototype/PLAN.md (Revision 3). Keep index.d.ts in step with this file.

/**
 * The four places a complaint can be handled, in hierarchical escalation order.
 * The City Bureau is the terminal level.
 *
 * NOTE: Initial intake does NOT require climbing from the bottom.
 * - Route A (Direct to Government) can be submitted directly to any government level
 *   (Woreda, Sub-City, or City Bureau) via validateRouteA.
 * - Route B begins at "business" and follows its own escalation workflow to government.
 * - Inter-level case transfers (handovers between government offices) follow this order strictly.
 */
export const HANDLING_LEVELS = Object.freeze(["business", "woreda", "subcity", "bureau"]);

/**
 * The two routes a consumer may take when filing a new complaint.
 *
 * Route A — Direct to Government: consumer picks a government level (Woreda, Sub-City or
 * City Bureau), then selects a specific office. The complaint is submitted directly to that
 * office. Used when the business is not on AddisB2B or the consumer prefers not to engage
 * the business first.
 *
 * Route B — Registered Business: consumer selects a business registered on AddisB2B. The
 * business receives the complaint first and has an opportunity to resolve it. If the business
 * does not resolve it, the consumer may escalate to the appropriate government office.
 */
export const COMPLAINT_ROUTES = Object.freeze(["direct_government", "registered_business"]);

/**
 * The government levels a consumer may target directly (Route A only).
 * This is a subset of HANDLING_LEVELS that excludes "business".
 * Ordered from most local (Woreda) to most senior (City Bureau).
 */
export const GOVERNMENT_LEVELS = Object.freeze(["woreda", "subcity", "bureau"]);

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

/**
 * Returns the next higher level in the escalation hierarchy, or null if already at the terminal level (bureau).
 * Used for inter-level upward transfers (handover notes between offices).
 */
export function nextLevel(level) {
  const index = HANDLING_LEVELS.indexOf(level);
  if (index < 0) throw new Error(`Unknown handling level: ${level}`);
  return HANDLING_LEVELS[index + 1] ?? null;
}

/**
 * True only for single-step upward moves: from a level to the one directly above it in the escalation hierarchy.
 *
 * Enforces that case transfers in progress never skip an intermediate level (e.g. woreda -> bureau is false)
 * and never move downward (e.g. subcity -> woreda is false).
 *
 * NOTE: This rule governs in-progress case escalation/transfers. It does NOT restrict Route A initial
 * complaint submission, which allows consumers to file directly at Woreda, Sub-City, or City Bureau.
 */
export function isValidClimb(from, to) {
  return nextLevel(from) === to && to !== null;
}

/** How a business sees a consumer: only a pseudonym, never name, phone or address. */
export function consumerAlias(sequence) {
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 99999) throw new Error("Invalid sequence.");
  return `Consumer ${String(sequence).padStart(5, "0")}`;
}

/**
 * True if the given level is a valid target for Route A (Direct to Government).
 * "business" is not a government level and is not a valid Route A target.
 */
export function isValidGovernmentLevel(level) {
  return GOVERNMENT_LEVELS.includes(level);
}

/**
 * True if the given office level matches the selected government level.
 * Applies to Woreda, Sub-City, and City Bureau offices equally.
 * A Woreda office (officeLevel "woreda") is only valid when targetLevel is "woreda".
 * This check must be enforced by the backend service after resolving the office record.
 *
 * @param {string} officeLevel - The level of the office retrieved from the database.
 * @param {string} targetLevel - The government level the consumer selected.
 */
export function officeBelongsToLevel(officeLevel, targetLevel) {
  return isValidGovernmentLevel(officeLevel) &&
    isValidGovernmentLevel(targetLevel) &&
    officeLevel === targetLevel;
}

/**
 * Validate a Route A complaint-creation input.
 * Returns null if valid, or an error message string if invalid.
 *
 * Rules:
 * - targetOfficeId must be a non-empty string (government office is mandatory at submission).
 * - targetLevel must be a valid government level (woreda, subcity, or bureau).
 * - escalatedToGovAt must be null (Route A enters government custody at intake, never escalated from business).
 * - merchantId is optional: if provided, it identifies an enrolled merchant as the subject of the
 *   complaint, but Route A never initiates bilateral merchant negotiation.
 * - Route A permits unregistered merchant details only when no registered merchant ID is supplied.
 * - Route A rejects simultaneous registered merchant ID and unregistered merchant details.
 * - If unregistered merchant details are supplied, unregisteredMerchantName is required.
 * - Route A may have no merchant identification at all (both registered and unregistered absent).
 */
export function validateRouteA({
  targetOfficeId,
  targetLevel,
  merchantId,
  unregisteredMerchantName,
  unregisteredMerchantLocation,
  unregisteredMerchantPhone,
  escalatedToGovAt
} = {}) {
  if (!targetOfficeId || typeof targetOfficeId !== "string" || !targetOfficeId.trim())
    return "Route A requires a targetOfficeId.";
  if (!isValidGovernmentLevel(targetLevel))
    return `Route A targetLevel must be one of ${GOVERNMENT_LEVELS.join(", ")}.`;
  if (escalatedToGovAt !== undefined && escalatedToGovAt !== null)
    return "Route A escalatedToGovAt must be null; Route A complaints enter government custody at intake.";

  const hasRegistered = merchantId !== undefined && merchantId !== null;
  const hasUnregName = unregisteredMerchantName !== undefined && unregisteredMerchantName !== null;
  const hasUnregLoc = unregisteredMerchantLocation !== undefined && unregisteredMerchantLocation !== null;
  const hasUnregPhone = unregisteredMerchantPhone !== undefined && unregisteredMerchantPhone !== null;
  const hasAnyUnreg = hasUnregName || hasUnregLoc || hasUnregPhone;

  if (hasRegistered && hasAnyUnreg)
    return "Route A cannot accept both a registered merchantId and unregistered merchant details.";

  if (hasRegistered) {
    if (typeof merchantId !== "string" || !merchantId.trim())
      return "Route A merchantId, if provided, must be a non-empty string.";
  }

  if (hasAnyUnreg) {
    if (!hasUnregName || typeof unregisteredMerchantName !== "string" || !unregisteredMerchantName.trim())
      return "Route A requires an unregisteredMerchantName when unregistered merchant details are provided.";
    if (hasUnregLoc && (typeof unregisteredMerchantLocation !== "string" || !unregisteredMerchantLocation.trim()))
      return "Route A unregisteredMerchantLocation, if provided, must be a non-empty string.";
    if (hasUnregPhone && (typeof unregisteredMerchantPhone !== "string" || !unregisteredMerchantPhone.trim()))
      return "Route A unregisteredMerchantPhone, if provided, must be a non-empty string.";
  }

  return null;
}

/**
 * Validate a Route B complaint-creation input.
 * Returns null if valid, or an error message string if invalid.
 *
 * Rules:
 * - merchantId is mandatory and must be a non-empty string.
 * - targetOfficeId must not be set at submission time; it is resolved on escalation.
 * - unregistered merchant fields must all be null or undefined.
 */
export function validateRouteB({
  merchantId,
  targetOfficeId,
  unregisteredMerchantName,
  unregisteredMerchantLocation,
  unregisteredMerchantPhone
} = {}) {
  if (!merchantId || typeof merchantId !== "string" || !merchantId.trim())
    return "Route B requires a merchantId.";
  if (targetOfficeId !== undefined && targetOfficeId !== null)
    return "Route B targetOfficeId must not be set at submission time; it is resolved on escalation.";
  if (
    (unregisteredMerchantName !== undefined && unregisteredMerchantName !== null) ||
    (unregisteredMerchantLocation !== undefined && unregisteredMerchantLocation !== null) ||
    (unregisteredMerchantPhone !== undefined && unregisteredMerchantPhone !== null)
  )
    return "Route B does not accept unregistered merchant details.";
  return null;
}
