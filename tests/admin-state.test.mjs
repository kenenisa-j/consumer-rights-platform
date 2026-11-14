import test from "node:test";
import assert from "node:assert/strict";
import { savePerson, addCategory, renameCategory, removeCategory, canEditCategories, saveContent, approveNotice, sendBackNotice } from "../web/src/features/gov/admin-state.ts";

const allowed = { roles: ["Woreda officer", "Woreda officer and administrator"], offices: ["Woreda 7, Akaki Kality"] };
const staff = () => [
  { id: "p1", name: "Meron Tadesse", email: "meron@example.com", role: "Woreda officer and administrator", office: "Woreda 7, Akaki Kality", status: "Active", cases: 3 },
  { id: "p2", name: "Dawit Kebede", email: "dawit@example.com", role: "Woreda officer", office: "Woreda 7, Akaki Kality", status: "Active", cases: 2 }];
const person = (over = {}) => ({ name: "Hana Girma", email: "hana@example.com", role: "Woreda officer", office: "Woreda 7, Akaki Kality", status: "Active", ...over });

test("a person is added only with a name, a valid email and a role and office this level manages", () => {
  assert.equal(savePerson(staff(), person(), allowed).ok, true);
  assert.equal(savePerson(staff(), person({ name: "Ha" }), allowed).ok, false);
  assert.equal(savePerson(staff(), person({ email: "not-an-email" }), allowed).ok, false);
  assert.equal(savePerson(staff(), person({ role: "City Bureau officer" }), allowed).ok, false, "role outside the level");
  assert.equal(savePerson(staff(), person({ office: "Woreda 3" }), allowed).ok, false, "office outside the level");
});

test("two people cannot share an email (case does not matter), but you may keep your own", () => {
  assert.equal(savePerson(staff(), person({ email: "DAWIT@example.com" }), allowed).ok, false);
  assert.equal(savePerson(staff(), person({ name: "Dawit K. Kebede", email: "dawit@example.com", role: "Woreda officer" }), allowed, "p2").ok, true);
});

test("an office always keeps one active administrator", () => {
  const demote = savePerson(staff(), person({ name: "Meron Tadesse", email: "meron@example.com", role: "Woreda officer" }), allowed, "p1");
  assert.equal(demote.ok, false);
  const leave = savePerson(staff(), person({ name: "Meron Tadesse", email: "meron@example.com", role: "Woreda officer and administrator", status: "On leave" }), allowed, "p1");
  assert.equal(leave.ok, false);
  const withSecond = savePerson(staff(), person({ role: "Woreda officer and administrator" }), allowed).list;
  const ok = savePerson(withSecond, person({ name: "Meron Tadesse", email: "meron@example.com", role: "Woreda officer", status: "On leave" }), allowed, "p1");
  assert.equal(ok.ok, true, "allowed once another active administrator exists");
});

test("only the City Bureau edits the category lists", () => {
  assert.equal(canEditCategories("bureau"), true);
  assert.equal(canEditCategories("woreda"), false);
  assert.equal(canEditCategories("subcity"), false);
});

test("categories: no duplicates, rename works, removing retires instead of deleting", () => {
  let list = [{ id: "c1", name: "Expired products" }, { id: "c2", name: "Other" }];
  assert.equal(addCategory(list, "expired PRODUCTS").ok, false);
  list = addCategory(list, "Counterfeit goods").list;
  assert.equal(list.length, 3);
  assert.equal(renameCategory(list, "c3", "Other").ok, false, "cannot rename onto an existing name");
  const removed = removeCategory(list, "c1");
  assert.equal(removed.list.length, 3, "nothing is deleted");
  assert.equal(removed.list.find(i => i.id === "c1").retired, true);
  assert.equal(addCategory(removed.list, "Expired products").ok, true, "a retired name can be added again");
});

test("the catch-all category cannot be removed", () => {
  assert.equal(removeCategory([{ id: "c1", name: "Other" }], "c1").ok, false);
  assert.equal(removeCategory([{ id: "c1", name: "Something else" }], "c1").ok, false);
});

test("Woreda notices wait for the Sub-City; the Woreda can never publish", () => {
  const r = saveContent("woreda", [], { title: "Scale checks at Market 097", type: "Local notice", body: "Sunday" }, "13 Nov 2026");
  assert.equal(r.list[0].status, "Waiting for the Sub-City");
  assert.equal(saveContent("woreda", [], { title: "Rights", type: "Rights article", body: "" }, "x").ok, false, "city-wide types are the Bureau's");
});

test("the Sub-City approves or sends back a Woreda notice, with a reason; others cannot", () => {
  const waiting = saveContent("woreda", [], { title: "Scale checks at Market 097", type: "Local notice", body: "Sunday" }, "13 Nov 2026").list;
  assert.equal(approveNotice("woreda", waiting, "n1", "x").ok, false);
  assert.equal(approveNotice("bureau", waiting, "n1", "x").ok, false);
  assert.equal(sendBackNotice("subcity", waiting, "n1", "no", "x").ok, false, "a reason is required");
  const back = sendBackNotice("subcity", waiting, "n1", "Add the time and the place.", "14 Nov 2026");
  assert.equal(back.list[0].status, "Draft");
  assert.equal(back.list[0].sentBack, "Add the time and the place.");
  assert.equal(approveNotice("subcity", waiting, "n1", "14 Nov 2026").list[0].status, "Published");
  assert.equal(approveNotice("subcity", approveNotice("subcity", waiting, "n1", "d").list, "n1", "d").ok, false, "already published");
});

test("the Sub-City publishes its own notices; the Bureau chooses a status for city-wide content", () => {
  assert.equal(saveContent("subcity", [], { title: "Office moves floor", type: "Local notice", body: "" }, "d").list[0].status, "Published");
  assert.equal(saveContent("bureau", [], { title: "Complaint procedure", type: "Law", body: "", status: "Archived" }, "d").list[0].status, "Archived");
  assert.equal(saveContent("bureau", [], { title: "Local", type: "Local notice", body: "" }, "d").ok, false);
});
