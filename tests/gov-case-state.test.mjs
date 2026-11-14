import test from "node:test";
import assert from "node:assert/strict";
import { applyGovAction } from "../web/src/features/gov/gov-case-state.ts";

const at = { when: "Thursday 12 November 2026, 10:00", short: "Thu 12 Nov, 10:00", iso: "2026-11-12T10:00" };
const base = (over = {}) => ({
  reference: "CC-2026-00123", title: "t", heldBy: "woreda", accepted: true, officer: "Meron Tadesse",
  status: { label: "x", tone: "info" }, official: "Assigned", onPlatform: true, passedThrough: [], handovers: [], history: [], ...over
});
const act = (state, viewer, action) => applyGovAction(state, viewer, action, at, "Meron Tadesse, Woreda 7");

test("a case must be accepted before anything else", () => {
  const s = base({ accepted: false, officer: undefined });
  assert.equal(act(s, "woreda", { type: "set_meeting", date: "d", time: "t", place: "p" }).ok, false);
  const r = act(s, "woreda", { type: "accept", officer: "Dawit Kebede" });
  assert.equal(r.ok, true);
  assert.equal(r.next.accepted, true);
  assert.equal(r.next.history[0].title, "Accepted by the Woreda");
  assert.equal(act(r.next, "woreda", { type: "accept", officer: "x" }).ok, false, "cannot accept twice");
});

test("only the level that holds the case can act on it", () => {
  const r = act(base({ heldBy: "subcity" }), "woreda", { type: "resolve" });
  assert.equal(r.ok, false);
  assert.match(r.notice, /now with the Sub-City/);
});

test("passing up moves the case exactly one level, clears the officer and records a handover note", () => {
  const w = act(base(), "woreda", { type: "pass_up", why: "No agreement after the meeting", note: "Visit findings attached.", toOffice: "Akaki Kality Sub-City" });
  assert.equal(w.ok, true);
  assert.equal(w.next.heldBy, "subcity");
  assert.equal(w.next.accepted, false);
  assert.equal(w.next.officer, undefined);
  assert.deepEqual(w.next.passedThrough, ["woreda"]);
  assert.equal(w.next.handovers.length, 1);
  // after passing up, the Woreda can no longer act
  assert.equal(act(w.next, "woreda", { type: "resolve" }).ok, false);
  // the Sub-City accepts and passes it to the City Bureau
  const s = act(w.next, "subcity", { type: "accept", officer: "Tsehay Bekele" });
  const b = act(s.next, "subcity", { type: "pass_up", why: "No agreement", note: "n", toOffice: "Addis Ababa City Bureau" });
  assert.equal(b.next.heldBy, "bureau");
  assert.deepEqual(b.next.passedThrough, ["woreda", "subcity"]);
});

test("the City Bureau is the last level: it cannot pass up, it refers", () => {
  const s = base({ heldBy: "bureau" });
  const up = act(s, "bureau", { type: "pass_up", why: "x", note: "y", toOffice: "nowhere" });
  assert.equal(up.ok, false);
  assert.match(up.notice, /last level/);
  const ref = act(s, "bureau", { type: "refer", to: "Legal office", note: "Business will not honour the agreement" });
  assert.equal(ref.ok, true);
  assert.equal(ref.next.closed, true);
  assert.equal(ref.next.referredTo, "Legal office");
  assert.equal(act(base(), "woreda", { type: "refer", to: "Legal office", note: "n" }).ok, false, "only the Bureau refers");
});

test("a payment can only be recorded after a solution was proposed, and it resolves the case", () => {
  assert.equal(act(base(), "woreda", { type: "record_paid", date: "d", time: "t", amount: "2250" }).ok, false);
  const p = act(base(), "woreda", { type: "propose_solution", kind: "Refund", amount: "2250", by: "2026-11-12", terms: "In cash" });
  assert.equal(p.next.official, "Settlement Pending");
  const paid = act(p.next, "woreda", { type: "record_paid", date: "2026-11-12", time: "09:30", amount: "2250" });
  assert.equal(paid.ok, true);
  assert.equal(paid.next.closed, true);
  assert.equal(paid.next.resolvedAt, "woreda");
  assert.equal(act(paid.next, "woreda", { type: "resolve" }).ok, false, "closed cases take no more actions");
});

test("contact with a business is recorded only when it is not on AddisB2B", () => {
  assert.equal(act(base({ onPlatform: true }), "woreda", { type: "record_contact", text: "Called the shop" }).ok, false);
  assert.equal(act(base({ onPlatform: false }), "woreda", { type: "record_contact", text: "Called the shop" }).ok, true);
});

test("every accepted action adds one history entry, newest first", () => {
  let s = base();
  s = act(s, "woreda", { type: "record_visit", date: "d", time: "t", findings: "Weighed four sacks" }).next;
  s = act(s, "woreda", { type: "set_meeting", date: "d", time: "t", place: "Woreda office" }).next;
  assert.deepEqual(s.history.map(h => h.title), ["Meeting set", "Visit to the stall"]);
});
