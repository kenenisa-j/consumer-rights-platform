import test from "node:test";
import assert from "node:assert/strict";
import { applyAction } from "../web/src/features/cases/case-state.ts";

const at = { when: "Thursday 12 November 2026, 10:00", short: "Thu 12 Nov, 10:00", iso: "2026-11-12T10:00" };
const base = (over = {}) => ({
  reference: "CC-2026-00123", title: "t", stage: "business", status: { label: "x", tone: "warn" }, official: "Sent to the business",
  pending: "business_offer", counterpart: "Gebriel Grain Traders", details: {}, handledBy: [], thread: [], updates: [], evidence: [], ...over
});

test("accepting the business offer resolves the case and records it", () => {
  const r = applyAction(base(), { type: "accept_offer" }, at);
  assert.equal(r.ok, true);
  assert.equal(r.next.stage, "resolved");
  assert.equal(r.next.closed, true);
  assert.equal(r.next.updates[0].title, "You accepted the offer");
});

test("moving to the Woreda is the only climb a consumer can make from the business", () => {
  const r = applyAction(base(), { type: "escalate", reason: "We could not agree" }, at);
  assert.equal(r.next.stage, "woreda");
  assert.equal(r.next.pending, "none");
  // the consumer cannot push a case from the Woreda straight to a higher level
  const again = applyAction(r.next, { type: "escalate", reason: "again" }, at);
  assert.equal(again.ok, false);
  assert.equal(again.next.stage, "woreda");
});

test("actions that do not fit the current state are refused and change nothing", () => {
  const s = base({ pending: "meeting", stage: "woreda" });
  for (const action of [{ type: "accept_offer" }, { type: "accept_settlement" }, { type: "send_info", text: "x", fileCount: 0 }]) {
    const r = applyAction(s, action, at);
    assert.equal(r.ok, false);
    assert.deepEqual(r.next, s);
  }
});

test("a closed case accepts nothing except a message about an outside-jurisdiction decision", () => {
  const closed = base({ closed: true, pending: "none" });
  assert.equal(applyAction(closed, { type: "send_message", text: "hi" }, at).ok, false);
  const outside = base({ closed: true, pending: "outside" });
  assert.equal(applyAction(outside, { type: "dispute_outside", text: "I disagree" }, at).ok, true);
});

test("the settlement can be accepted or declined with a reason", () => {
  const s = base({ stage: "bureau", pending: "settlement" });
  const yes = applyAction(s, { type: "accept_settlement" }, at);
  assert.equal(yes.next.pending, "none");
  assert.equal(yes.next.status.tone, "ok");
  const no = applyAction(s, { type: "decline_settlement", reason: "The amount is not enough", text: "Too low" }, at);
  assert.equal(no.next.updates[0].text, "The amount is not enough");
  assert.equal(no.next.thread[0].from, "me");
});

test("messages are added newest first with a unique id", () => {
  let s = base();
  s = applyAction(s, { type: "send_message", text: "one" }, at).next;
  s = applyAction(s, { type: "send_message", text: "two" }, at).next;
  assert.deepEqual(s.thread.map(m => m.text), ["two", "one"]);
  assert.notEqual(s.thread[0].id, s.thread[1].id);
});
