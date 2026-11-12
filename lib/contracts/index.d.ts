export type HandlingLevel = "business" | "woreda" | "subcity" | "bureau";
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
export declare function nextLevel(level: HandlingLevel): HandlingLevel | null;
export declare function isValidClimb(from: HandlingLevel, to: HandlingLevel): boolean;
export declare function consumerAlias(sequence: number): string;

/** Envelope every backend response uses. */
export interface ApiSuccess<T> { ok: true; data: T }
export interface ApiFailure { ok: false; error: { code: string; message: string; fields?: Record<string, string> } }
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
