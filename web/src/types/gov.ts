// View types for the government workspaces (Woreda, Sub-City, City Bureau). Like types/case.ts, these move to
// lib/contracts once the API shape is agreed with the backend developer.
import type { Tone, UpdateEntry, EvidenceFile } from "./case";

export type GovLevel = "woreda" | "subcity" | "bureau";
export type Rows = ReadonlyArray<readonly [string, string]>;

export interface GovMessage { who: string; when: string; text: string; side: "consumer" | "business" | "office" }

export interface GovCase {
  reference: string;
  title: string;
  /** The level that holds the case now. Only this level can act on it. */
  heldBy: GovLevel;
  accepted: boolean;
  officer?: string;
  status: { label: string; tone: Tone | "grey" };
  official: string;
  /** Business is on AddisB2B (the complaint started there) or came straight to a Woreda. */
  onPlatform: boolean;
  /** Levels the case has already passed through (for the chain). */
  passedThrough: GovLevel[];
  resolvedAt?: GovLevel;
  referredTo?: string;
  closed?: boolean;
  reached: { title: string; text: string };
  handovers: { title: string; from: string; when: string; text: string }[];
  complaint: Rows;
  consumer: Rows;
  thread: GovMessage[];
  evidence: EvidenceFile[];
  history: UpdateEntry[];
  solution?: { type: string; amount: string; by: string; terms: string };
  meeting?: string;
}

export interface ChainStep { label: string; note: string; state: "done" | "now" | "todo" | "skip" }

export interface Tile { value: string; label: string; alert?: boolean }
export interface ActionRow { label: string; sub: string; what: string; waiting: string; href?: string; urgent?: boolean }
export interface SideNote { icon?: string; title: string; text?: string; items?: string[]; link?: { href: string; label: string } }

export interface CaseRow {
  reference: string; title: string; business: string; via: string; status: string; open: string;
  group: string; action?: boolean; hasDetail?: boolean;
}

export interface LevelDashboard {
  title: string; subtitle: string; tiles: Tile[]; rows: ActionRow[]; notes: SideNote[];
  /** City Bureau only: where open cases are right now. */
  spread?: { label: string; value: number }[];
}
