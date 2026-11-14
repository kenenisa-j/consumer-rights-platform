export type HandlingLevel = "business" | "woreda" | "subcity" | "bureau";

/**
 * The two complaint-filing routes available to consumers.
 * Route A: direct_government — consumer picks a government level and office.
 * Route B: registered_business — complaint goes to the business first; escalation is optional.
 */
export type ComplaintRoute = "direct_government" | "registered_business";

/**
 * Government levels selectable by a consumer in Route A (Direct to Government).
 * Subset of HandlingLevel — excludes "business".
 */
export type GovernmentLevel = "woreda" | "subcity" | "bureau";

export type PortalKey = "consumer" | "business" | "woreda" | "subcity" | "bureau";
export type RoleKey =
  | "consumer" | "business_owner" | "woreda_officer" | "woreda_admin"
  | "subcity_coordinator" | "bureau_officer" | "bureau_admin" | "content_admin";
export type CaseStatus =
  | "submitted" | "under_initial_review" | "information_required" | "accepted" | "assigned"
  | "under_investigation" | "awaiting_merchant_response" | "under_reconciliation"
  | "settlement_pending" | "resolved" | "escalated_referred" | "outside_jurisdiction" | "closed";
export type TipStatus =
  | "received" | "under_review" | "follow_up_planned" | "converted_to_case"
  | "closed_action_taken" | "closed_no_action";
export type ComplaintCategory =
  | "misleading_commercial_practice" | "defective_goods" | "expired_products" | "unsafe_products"
  | "price_above_ceiling" | "wrong_weight_measure" | "service_complaint" | "other";
export type OfferType = "refund" | "replacement" | "repair" | "other";
export type ConversationKind =
  | "consumer_business" | "consumer_government" | "business_government" | "government_government";
export type Language = "en" | "am";
export type ReferenceKind = "complaint" | "tip";

export declare const HANDLING_LEVELS: readonly HandlingLevel[];
export declare const COMPLAINT_ROUTES: readonly ComplaintRoute[];
export declare const GOVERNMENT_LEVELS: readonly GovernmentLevel[];
export declare const PORTALS: Readonly<Record<PortalKey, { path: string; prototype: string }>>;
export declare const ROLES: Readonly<Record<RoleKey, { portal: PortalKey; level: HandlingLevel | null }>>;
export declare const CASE_STATUSES: readonly CaseStatus[];
export declare const TIP_STATUSES: readonly TipStatus[];
export declare const COMPLAINT_CATEGORIES: readonly ComplaintCategory[];
export declare const OFFER_TYPES: readonly OfferType[];
export declare const CONVERSATION_KINDS: readonly ConversationKind[];
export declare const LANGUAGES: readonly Language[];
export declare const REFERENCE_PATTERNS: Readonly<Record<ReferenceKind, RegExp>>;

export declare function formatReference(kind: ReferenceKind, year: number, sequence: number): string;

/** Returns the next level in the escalation hierarchy, or null at bureau (terminal). */
export declare function nextLevel(level: HandlingLevel): HandlingLevel | null;

/**
 * True only for single-step upward moves in the escalation hierarchy.
 * Governs in-progress case transfers/handovers; does not restrict Route A initial intake.
 */
export declare function isValidClimb(from: HandlingLevel, to: HandlingLevel): boolean;

export declare function consumerAlias(sequence: number): string;

/** True if the level is a valid Route A (Direct to Government) target. */
export declare function isValidGovernmentLevel(level: string): level is GovernmentLevel;

/**
 * True if the resolved office's level matches the government level the consumer selected.
 * Must be called by the backend service after looking up the office record.
 * Applies equally to Woreda, Sub-City, and City Bureau offices.
 * Example: a Woreda office (officeLevel "woreda") is rejected when targetLevel is "subcity".
 */
export declare function officeBelongsToLevel(officeLevel: string, targetLevel: string): boolean;

/** Common Route A properties */
export interface RouteABaseInput {
  route: "direct_government";
  targetLevel: GovernmentLevel;
  targetOfficeId: string;
  escalatedToGovAt?: never;
}

/** Route A when no merchant is identified */
export interface RouteANoMerchantInput extends RouteABaseInput {
  merchantId?: undefined;
  unregisteredMerchantName?: undefined;
  unregisteredMerchantLocation?: undefined;
  unregisteredMerchantPhone?: undefined;
}

/** Route A when an enrolled registered merchant is identified */
export interface RouteARegisteredMerchantInput extends RouteABaseInput {
  merchantId: string;
  unregisteredMerchantName?: never;
  unregisteredMerchantLocation?: never;
  unregisteredMerchantPhone?: never;
}

/** Route A when an informal or unregistered merchant is identified */
export interface RouteAUnregisteredMerchantInput extends RouteABaseInput {
  merchantId?: never;
  unregisteredMerchantName: string;
  unregisteredMerchantLocation?: string;
  unregisteredMerchantPhone?: string;
}

/** Discriminated shapes for Route A complaint creation input */
export type RouteAInput =
  | RouteANoMerchantInput
  | RouteARegisteredMerchantInput
  | RouteAUnregisteredMerchantInput;

/** Input shape for Route B (Registered Business) complaint creation. */
export interface RouteBInput {
  route: "registered_business";
  merchantId: string;
  /** Not provided at submission — resolved on escalation. */
  targetOfficeId?: never;
  targetLevel?: never;
  unregisteredMerchantName?: never;
  unregisteredMerchantLocation?: never;
  unregisteredMerchantPhone?: never;
}

/** Discriminated union for complaint-creation routing input. */
export type ComplaintRouteInput = RouteAInput | RouteBInput;

/**
 * Validate a Route A complaint-creation input.
 * Returns null if valid, or an error message string if invalid.
 */
export declare function validateRouteA(
  input?: Partial<
    RouteABaseInput & {
      merchantId?: string | null;
      unregisteredMerchantName?: string | null;
      unregisteredMerchantLocation?: string | null;
      unregisteredMerchantPhone?: string | null;
      escalatedToGovAt?: unknown;
    }
  >
): string | null;

/**
 * Validate a Route B complaint-creation input.
 * Returns null if valid, or an error message string if invalid.
 */
export declare function validateRouteB(
  input?: Partial<
    RouteBInput & {
      targetOfficeId?: unknown;
      unregisteredMerchantName?: unknown;
      unregisteredMerchantLocation?: unknown;
      unregisteredMerchantPhone?: unknown;
    }
  >
): string | null;

/** Envelope every backend response uses. */
export interface ApiSuccess<T> { ok: true; data: T }
export interface ApiFailure { ok: false; error: { code: string; message: string; fields?: Record<string, string> } }
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
