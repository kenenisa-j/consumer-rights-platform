import test from "node:test";
import assert from "node:assert/strict";
import { applyBizAction } from "../web/src/features/business/biz-case-state.ts";
import { BIZ_STEPS, buildBizCase } from "../web/src/mocks/biz-cases.ts";

const at = { when: "Thursday 12 November 2026, 10:00", short: "Thu 12 Nov, 10:00", iso: "2026-11-12T10:00" };

test("PRIVACY: the business view never contains the consumer's name, phone, email or address in any state", () => {
  const forbidden = [/Hirut/i, /Alemu/i, /0900/, /hirut\.alemu/i, /@example\.com/i, /Lives in/i];
  for (const step of BIZ_STEPS) {
    const json = JSON.stringify(buildBizCase(step));
    for (const pattern of forbidden) assert.doesNotMatch(json, pattern, `${step} leaks ${pattern}`);
    assert.match(json, /Consumer 00123/);
  }
});

test("PRIVACY: only files the consumer shared with the business are listed", () => {
  for (const step of BIZ_STEPS) assert.ok(buildBizCase(step).evidence.every(f => f.shared), step);
});

test("the first reply moves the case to waiting and records the offer", () => {
  const r = applyBizAction(buildBizCase("reply"), { type: "reply", explanation: "We are sorry.", position: "accept", offer: "replacement", amount: "", detail: "a new 25 kg sack" }, at);
  assert.equal(r.ok, true);
  assert.equal(r.next.pending, "none");
  assert.equal(r.next.history[0].title, "You replied");
  assert.equal(r.next.thread[0].from, "me");
  assert.equal(r.next.deadline, undefined);
});

test("answering the consumer is possible only when an answer is waiting", () => {
  assert.equal(applyBizAction(buildBizCase("reply"), { type: "keep_offer", message: "" }, at).ok, false);
  const refund = applyBizAction(buildBizCase("answer"), { type: "offer_refund", amount: "2250", when: "within 2 days" }, at);
  assert.equal(refund.ok, true);
  assert.equal(refund.next.history[0].title, "You offered the refund");
  assert.equal(applyBizAction(refund.next, { type: "offer_refund", amount: "1", when: "x" }, at).ok, false, "cannot answer twice");
});

test("an agreed refund can be confirmed; a government settlement needs proof", () => {
  const direct = applyBizAction(buildBizCase("agreed"), { type: "confirm_paid", date: "2026-11-05", how: "Cash", hasProof: false }, at);
  assert.equal(direct.ok, true);
  assert.equal(direct.next.closed, true);
  const noProof = applyBizAction(buildBizCase("settlement"), { type: "confirm_paid", date: "2026-11-12", time: "09:30", how: "Cash", hasProof: false }, at);
  assert.equal(noProof.ok, false);
  const withProof = applyBizAction(buildBizCase("settlement"), { type: "confirm_paid", date: "2026-11-12", time: "09:30", how: "Cash", hasProof: true }, at);
  assert.equal(withProof.ok, true);
  assert.equal(withProof.next.closed, false, "the officer, not the business, closes a government settlement");
});

test("writing to an officer works only while a government office holds the case", () => {
  assert.equal(applyBizAction(buildBizCase("reply"), { type: "message_officer", text: "hi" }, at).ok, false);
  assert.equal(applyBizAction(buildBizCase("woreda"), { type: "message_officer", text: "We will attend." }, at).ok, true);
});

test("a closed complaint accepts nothing", () => {
  const closed = buildBizCase("resolved");
  for (const a of [{ type: "message_officer", text: "x" }, { type: "keep_offer", message: "" }]) assert.equal(applyBizAction(closed, a, at).ok, false);
});
