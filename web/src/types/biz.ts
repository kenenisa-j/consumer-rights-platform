// View types for the business desk. The business sees a LIMITED view: the consumer only as "Consumer 00123",
// never their name, phone, email or address (documentation/security-and-privacy.md). Like the other view types,
// these move to lib/contracts once the API shape is agreed.
import type { EvidenceFile, Tone, UpdateEntry } from "./case";

export type BizPending = "reply" | "answer" | "agreed" | "gov" | "settlement" | "none";

export interface BizMessage { id: string; from: "consumer" | "me" | "office"; who: string; when: string; text: string }

export interface BizCase {
  reference: string;
  title: string;
  /** How the business sees the consumer: "Consumer 00123". */
  alias: string;
  status: { label: string; tone: Tone | "grey" };
  official: string;
  pending: BizPending;
  closed?: boolean;
  deadline?: string;
  banner?: { tone: Tone | "plain"; title: string; text?: string };
  consumerSays: ReadonlyArray<readonly [string, string]>;
  narrative: string;
  thread: BizMessage[];
  history: UpdateEntry[];
  /** Only the files the consumer chose to share with the business. */
  evidence: EvidenceFile[];
  handledBy?: ReadonlyArray<readonly [string, string]>;
  /** When a government office holds the case: who, and what it may ask of the business. */
  gov?: { office: string; officer: string; asks: string[] };
  agreement?: ReadonlyArray<readonly [string, string]>;
  proofRequired?: boolean;
}

export interface BizSummary {
  reference: string; title: string; alias: string; status: BizCase["status"]; deadline: string; group: string;
  action?: boolean; hasDetail?: boolean;
}
