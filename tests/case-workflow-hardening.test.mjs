import test from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import { CaseStatus } from "@prisma/client";
import {
  CASE_TRANSITION_MATRIX,
  isValidTransition,
  assertValidTransition,
} from "../backend/dist/modules/cases/case-workflow.validator.js";

test("Phase 4.11: Case transition matrix allows valid lifecycle paths", () => {
  // 1. Business intake to offer
  assert.equal(isValidTransition(CaseStatus.SUBMITTED_TO_BUSINESS, CaseStatus.BUSINESS_OFFER_PENDING), true);

  // 2. Business offer to mutual resolution
  assert.equal(isValidTransition(CaseStatus.BUSINESS_OFFER_PENDING, CaseStatus.RESOLVED_MUTUALLY), true);

  // 3. Business offer rejection back to submitted
  assert.equal(isValidTransition(CaseStatus.BUSINESS_OFFER_PENDING, CaseStatus.SUBMITTED_TO_BUSINESS), true);

  // 4. Escalation to government
  assert.equal(isValidTransition(CaseStatus.SUBMITTED_TO_BUSINESS, CaseStatus.ESCALATED_TO_GOVERNMENT), true);
  assert.equal(isValidTransition(CaseStatus.BUSINESS_OFFER_PENDING, CaseStatus.ESCALATED_TO_GOVERNMENT), true);

  // 5. Government intake, triage, and assignment
  assert.equal(isValidTransition(CaseStatus.ESCALATED_TO_GOVERNMENT, CaseStatus.RECEIVED_BY_OFFICE), true);
  assert.equal(isValidTransition(CaseStatus.RECEIVED_BY_OFFICE, CaseStatus.UNDER_INITIAL_REVIEW), true);
  assert.equal(isValidTransition(CaseStatus.UNDER_INITIAL_REVIEW, CaseStatus.OFFICER_ASSIGNED), true);

  // 6. Investigation progression
  assert.equal(isValidTransition(CaseStatus.OFFICER_ASSIGNED, CaseStatus.INSPECTION_PENDING), true);
  assert.equal(isValidTransition(CaseStatus.INSPECTION_PENDING, CaseStatus.INSPECTION_ACTIVE), true);
  assert.equal(isValidTransition(CaseStatus.INSPECTION_ACTIVE, CaseStatus.INSPECTION_COMPLETED), true);

  // 7. Decision and resolution
  assert.equal(isValidTransition(CaseStatus.INSPECTION_COMPLETED, CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER), true);
  assert.equal(isValidTransition(CaseStatus.INSPECTION_COMPLETED, CaseStatus.CONCILIATION_SCHEDULED), true);
  assert.equal(isValidTransition(CaseStatus.INSPECTION_COMPLETED, CaseStatus.COURT_REFERRAL_ISSUED), true);

  // 8. Reopening closed complaints
  assert.equal(isValidTransition(CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER, CaseStatus.UNDER_INITIAL_REVIEW), true);
  assert.equal(isValidTransition(CaseStatus.CLOSED_OUTSIDE_JURISDICTION, CaseStatus.UNDER_INITIAL_REVIEW), true);
  assert.equal(isValidTransition(CaseStatus.CLOSED_WITHDRAWN, CaseStatus.UNDER_INITIAL_REVIEW), true);
});

test("Phase 4.11: Case transition matrix rejects illegal lifecycle jumps", () => {
  // 1. Cannot jump from business intake directly to administrative order without government review
  assert.equal(isValidTransition(CaseStatus.SUBMITTED_TO_BUSINESS, CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER), false);
  assert.throws(
    () => assertValidTransition(CaseStatus.SUBMITTED_TO_BUSINESS, CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER),
    (err) => err.response?.code === "INVALID_STATUS_TRANSITION",
  );

  // 2. Cannot jump from initial intake directly to inspection completed
  assert.equal(isValidTransition(CaseStatus.RECEIVED_BY_OFFICE, CaseStatus.INSPECTION_COMPLETED), false);

  // 3. Closed case cannot transition to active inspection
  assert.equal(isValidTransition(CaseStatus.CLOSED_WITHDRAWN, CaseStatus.INSPECTION_ACTIVE), false);

  // 4. Resolved case cannot transition directly to business offer pending
  assert.equal(isValidTransition(CaseStatus.RESOLVED_MUTUALLY, CaseStatus.BUSINESS_OFFER_PENDING), false);
});

test("Phase 4.11: Terminal status immutability safeguards", () => {
  const terminalStatuses = [
    CaseStatus.RESOLVED_MUTUALLY,
    CaseStatus.RESOLVED_ADMINISTRATIVE_ORDER,
    CaseStatus.COURT_REFERRAL_ISSUED,
    CaseStatus.CLOSED_OUTSIDE_JURISDICTION,
    CaseStatus.CLOSED_WITHDRAWN,
  ];

  for (const status of terminalStatuses) {
    const allowedTargets = CASE_TRANSITION_MATRIX[status];
    // Must only allow transition to UNDER_INITIAL_REVIEW (via formal administrative reopen)
    assert.deepEqual(
      allowedTargets,
      [CaseStatus.UNDER_INITIAL_REVIEW],
      `Terminal status ${status} must only allow transition to UNDER_INITIAL_REVIEW upon reopen`,
    );
  }
});

