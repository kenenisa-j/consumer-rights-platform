import test from "node:test";
import assert from "node:assert/strict";
import {
  HANDLING_LEVELS, PORTALS, ROLES, CASE_STATUSES, TIP_STATUSES, COMPLAINT_CATEGORIES,
  REFERENCE_PATTERNS, formatReference, nextLevel, isValidClimb, consumerAlias
} from "@consumer-rights/contracts";

test("the climb is business, woreda, subcity, bureau and ends at the bureau", () => {
  assert.deepEqual([...HANDLING_LEVELS], ["business", "woreda", "subcity", "bureau"]);
  assert.equal(nextLevel("business"), "woreda");
  assert.equal(nextLevel("bureau"), null);
});

test("a complaint never skips a level or moves down", () => {
  assert.equal(isValidClimb("woreda", "subcity"), true);
  assert.equal(isValidClimb("business", "subcity"), false);
  assert.equal(isValidClimb("subcity", "woreda"), false);
  assert.equal(isValidClimb("bureau", "bureau"), false);
});

test("reference codes match the agreed formats", () => {
  assert.equal(formatReference("complaint", 2026, 123), "CC-2026-00123");
  assert.equal(formatReference("tip", 2026, 45), "TIP-2026-00045");
  assert.match("CC-2026-00123", REFERENCE_PATTERNS.complaint);
  assert.doesNotMatch("CMP-2026-00123", REFERENCE_PATTERNS.complaint);
  assert.throws(() => formatReference("complaint", 2026, 0));
});

test("the business sees only a pseudonym for the consumer", () => {
  assert.equal(consumerAlias(123), "Consumer 00123");
});

test("every role belongs to a real portal and level", () => {
  for (const [key, role] of Object.entries(ROLES)) {
    assert.ok(PORTALS[role.portal], `${key} has unknown portal ${role.portal}`);
    if (role.level) assert.ok(HANDLING_LEVELS.includes(role.level), `${key} has unknown level`);
  }
});

test("status and category lists are complete and unique", () => {
  assert.equal(CASE_STATUSES.length, 13);
  assert.equal(TIP_STATUSES.length, 6);
  assert.equal(COMPLAINT_CATEGORIES.length, 8);
  for (const list of [CASE_STATUSES, TIP_STATUSES, COMPLAINT_CATEGORIES]) {
    assert.equal(new Set(list).size, list.length);
  }
});
