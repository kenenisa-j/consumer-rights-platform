import test from "node:test";
import assert from "node:assert/strict";
import {
  HANDLING_LEVELS, PORTALS, ROLES, CASE_STATUSES, TIP_STATUSES, COMPLAINT_CATEGORIES,
  REFERENCE_PATTERNS, formatReference, nextLevel, isValidClimb, consumerAlias,
  COMPLAINT_ROUTES, GOVERNMENT_LEVELS, isValidGovernmentLevel, officeBelongsToLevel,
  validateRouteA, validateRouteB
} from "@consumer-rights/contracts";

test("escalation hierarchy defines ordered levels ending at the bureau", () => {
  assert.deepEqual([...HANDLING_LEVELS], ["business", "woreda", "subcity", "bureau"]);
  assert.equal(nextLevel("business"), "woreda");
  assert.equal(nextLevel("woreda"), "subcity");
  assert.equal(nextLevel("subcity"), "bureau");
  assert.equal(nextLevel("bureau"), null);
});

test("inter-level transfer climb rule: moves up one level at a time, never skips or moves down", () => {
  // Valid single-step upward moves between levels
  assert.equal(isValidClimb("business", "woreda"), true);
  assert.equal(isValidClimb("woreda", "subcity"), true);
  assert.equal(isValidClimb("subcity", "bureau"), true);

  // Skipping a level is rejected
  assert.equal(isValidClimb("business", "subcity"), false);
  assert.equal(isValidClimb("business", "bureau"), false);
  assert.equal(isValidClimb("woreda", "bureau"), false);

  // Moving down is rejected
  assert.equal(isValidClimb("subcity", "woreda"), false);
  assert.equal(isValidClimb("bureau", "subcity"), false);
  assert.equal(isValidClimb("bureau", "woreda"), false);

  // Lateral / same-level moves are not climbs
  assert.equal(isValidClimb("bureau", "bureau"), false);
  assert.equal(isValidClimb("woreda", "woreda"), false);
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

// ---- Dual Routing ----

test("COMPLAINT_ROUTES has exactly two values", () => {
  assert.deepEqual([...COMPLAINT_ROUTES], ["direct_government", "registered_business"]);
});

test("GOVERNMENT_LEVELS excludes business and matches climbing order", () => {
  assert.deepEqual([...GOVERNMENT_LEVELS], ["woreda", "subcity", "bureau"]);
  assert.equal(isValidGovernmentLevel("woreda"), true);
  assert.equal(isValidGovernmentLevel("bureau"), true);
  assert.equal(isValidGovernmentLevel("business"), false);
  assert.equal(isValidGovernmentLevel(""), false);
});

test("Route A: no merchant, registered merchant, and unregistered merchant intake", () => {
  // 1. Route A permits no identified merchant at all
  assert.equal(validateRouteA({ targetOfficeId: "off-woreda-001", targetLevel: "woreda" }), null);
  assert.equal(validateRouteA({ targetOfficeId: "off-subcity-001", targetLevel: "subcity" }), null);
  assert.equal(validateRouteA({ targetOfficeId: "off-bureau-001", targetLevel: "bureau" }), null);

  // 2. Route A permits an optional registered merchant
  assert.equal(validateRouteA({
    targetOfficeId: "off-woreda-001",
    targetLevel: "woreda",
    merchantId: "biz-001"
  }), null);

  // 3. Route A permits an optional unregistered merchant with name
  assert.equal(validateRouteA({
    targetOfficeId: "off-woreda-001",
    targetLevel: "woreda",
    unregisteredMerchantName: "Merkato Spices"
  }), null);

  // 4. Route A permits an optional unregistered merchant with full location/phone details
  assert.equal(validateRouteA({
    targetOfficeId: "off-woreda-001",
    targetLevel: "woreda",
    unregisteredMerchantName: "Merkato Spices",
    unregisteredMerchantLocation: "Block 4, Stall 12",
    unregisteredMerchantPhone: "0911000000"
  }), null);
});

test("Route A: rejection of conflicting merchant details, missing required fields, and invalid escalation state", () => {
  // Rejects simultaneous registered merchant ID and unregistered merchant details
  assert.ok(validateRouteA({
    targetOfficeId: "off-woreda-001",
    targetLevel: "woreda",
    merchantId: "biz-001",
    unregisteredMerchantName: "Merkato Spices"
  }));
  assert.ok(validateRouteA({
    targetOfficeId: "off-woreda-001",
    targetLevel: "woreda",
    merchantId: "biz-001",
    unregisteredMerchantLocation: "Block 4"
  }));

  // Rejects unregistered details when unregisteredMerchantName is missing or empty
  assert.ok(validateRouteA({
    targetOfficeId: "off-woreda-001",
    targetLevel: "woreda",
    unregisteredMerchantLocation: "Block 4"
  }));
  assert.ok(validateRouteA({
    targetOfficeId: "off-woreda-001",
    targetLevel: "woreda",
    unregisteredMerchantName: "   "
  }));

  // Rejects missing targetOfficeId (government office is always mandatory on Route A)
  assert.ok(validateRouteA({ targetOfficeId: "", targetLevel: "woreda" }));
  assert.ok(validateRouteA({ targetLevel: "woreda" }));
  assert.ok(validateRouteA({ targetLevel: "woreda", merchantId: "biz-001" }));

  // Rejects invalid targetLevel
  assert.ok(validateRouteA({ targetOfficeId: "off-001", targetLevel: "business" }));
  assert.ok(validateRouteA({ targetOfficeId: "off-001", targetLevel: "region" }));

  // Rejects empty merchantId string
  assert.ok(validateRouteA({ targetOfficeId: "off-001", targetLevel: "woreda", merchantId: "" }));
  assert.ok(validateRouteA({ targetOfficeId: "off-001", targetLevel: "woreda", merchantId: "   " }));

  // Rejects escalatedToGovAt on Route A (intake is direct to government)
  assert.ok(validateRouteA({
    targetOfficeId: "off-woreda-001",
    targetLevel: "woreda",
    escalatedToGovAt: new Date()
  }));
});

test("Route B: requires registered merchant, prohibits government office and unregistered details at intake", () => {
  // Valid Route B input requires merchantId only
  assert.equal(validateRouteB({ merchantId: "biz-001" }), null);

  // Invalid: missing or empty merchantId
  assert.ok(validateRouteB({ merchantId: "" }));
  assert.ok(validateRouteB({ merchantId: "   " }));
  assert.ok(validateRouteB({}));

  // Invalid: government office must not be set at initial intake
  assert.ok(validateRouteB({ merchantId: "biz-001", targetOfficeId: "off-001" }));

  // Invalid: unregistered merchant details are prohibited on Route B
  assert.ok(validateRouteB({ merchantId: "biz-001", unregisteredMerchantName: "Informal Stall" }));
  assert.ok(validateRouteB({ merchantId: "biz-001", unregisteredMerchantLocation: "Merkato" }));
  assert.ok(validateRouteB({ merchantId: "biz-001", unregisteredMerchantPhone: "0911000000" }));
});

test("officeBelongsToLevel: each level only matches itself", () => {
  // Each government level accepts an office at its own level.
  assert.equal(officeBelongsToLevel("woreda", "woreda"), true);
  assert.equal(officeBelongsToLevel("subcity", "subcity"), true);
  assert.equal(officeBelongsToLevel("bureau", "bureau"), true);

  // A Woreda office is not valid for Sub-City or Bureau selections.
  assert.equal(officeBelongsToLevel("woreda", "subcity"), false);
  assert.equal(officeBelongsToLevel("woreda", "bureau"), false);

  // A Sub-City office is not valid for Woreda or Bureau selections.
  assert.equal(officeBelongsToLevel("subcity", "woreda"), false);
  assert.equal(officeBelongsToLevel("subcity", "bureau"), false);

  // A Bureau office is not valid for Woreda or Sub-City selections.
  assert.equal(officeBelongsToLevel("bureau", "woreda"), false);
  assert.equal(officeBelongsToLevel("bureau", "subcity"), false);

  // "business" is not a valid office level or target level.
  assert.equal(officeBelongsToLevel("business", "woreda"), false);
  assert.equal(officeBelongsToLevel("woreda", "business"), false);

  // Unknown or empty strings are rejected.
  assert.equal(officeBelongsToLevel("", "woreda"), false);
  assert.equal(officeBelongsToLevel("woreda", ""), false);
});
