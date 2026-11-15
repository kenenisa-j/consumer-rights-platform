// View types for the consumer's case screens. Move to lib/contracts when the API shape is agreed with the
// backend developer (documentation/git-workflow.md, contract-first handoffs).
import type { HandlingLevel } from "@consumer-rights/contracts";

export type Stage = HandlingLevel | "resolved";
export type Tone = "info" | "ok" | "warn" | "bad";

/** What the consumer can do next. Drives which action panel the case page shows. */
export type PendingAction =
  | "none" | "business_offer" | "business_refund" | "meeting" | "settlement" | "info_required" | "outside";

export interface ThreadMessage { id: string; from: "me" | "office" | "business"; who: string; when: string; text: string }
export interface UpdateEntry { title: string; when: string; iso: string; text?: string }
export interface EvidenceFile { id?: string; name: string; note: string; size: string; shared: boolean }
export interface Alternative { title: string; text: string; href: string }

export interface CaseData {
  reference: string;
  title: string;
  stage: Stage;
  status: { label: string; tone: Tone | "grey" };
  official: string;
  pending: PendingAction;
  banner?: { tone: Tone | "plain"; title: string; text?: string };
  details: { problem: string; business: string; bought: string; paid: string; asked: string; narrative: string };
  handledBy: ReadonlyArray<readonly [string, string]>;
  /** Short name of whoever the consumer writes to now (the business or an office). */
  counterpart: string;
  thread: ThreadMessage[];
  updates: UpdateEntry[];
  evidence: EvidenceFile[];
  offer?: { title: string; text: string };
  meeting?: { title: string; text: string };
  settlement?: ReadonlyArray<readonly [string, string]>;
  infoRequest?: { from: string; when: string; text: string; deadline: string };
  outside?: { from: string; when: string; text: string; alternatives: Alternative[] };
  closed?: boolean;
  /** A real case from the database: messages, offers and withdrawing are not connected yet, so those controls are hidden. */
  readOnly?: boolean;
}

export interface CaseSummary {
  reference: string; title: string; business: string; status: CaseData["status"]; updated: string; href: string;
}

/** A moment in three forms: long (timeline), short (messages) and ISO. */
export interface Stamp { when: string; short: string; iso: string }
