import type { ChainStep, GovCase, GovLevel } from "@/types/gov";
import { LEVEL_LABEL } from "./gov-case-state";

const ORDER: GovLevel[] = ["woreda", "subcity", "bureau"];

/** "Where this case is": the business, then each government level, as seen by the officer at `viewer`. */
export function chainFor(c: GovCase, viewer: GovLevel): ChainStep[] {
  const steps: ChainStep[] = [c.onPlatform
    ? { label: "Business", note: "No agreement", state: "done" }
    : { label: "Business", note: "Not on AddisB2B", state: "skip" }];

  for (const level of ORDER) {
    const label = LEVEL_LABEL[level];
    if (c.resolvedAt === level) steps.push({ label, note: "Resolved here", state: "done" });
    else if (c.closed && c.heldBy === level && c.referredTo) steps.push({ label, note: `Referred to ${c.referredTo}`, state: "done" });
    else if (c.passedThrough.includes(level)) steps.push({ label, note: "Not resolved", state: "done" });
    else if (c.heldBy === level && !c.closed) {
      steps.push({ label, note: viewer === level ? (level === "bureau" ? "With you now: last level" : "With you now") : "Holding it now", state: "now" });
    } else steps.push({ label, note: "Not reached", state: "todo" });
  }
  return steps;
}
