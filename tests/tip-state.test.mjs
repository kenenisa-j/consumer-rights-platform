import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function loadTsModule(relPath) {
  const fullPath = path.resolve(__dirname, relPath);
  const source = fs.readFileSync(fullPath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const dataUri = `data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`;
  return import(dataUri);
}

const { applyTipAction } = await loadTsModule("../web/src/features/gov/tip-state.ts");
const { TIP_45 } = await loadTsModule("../web/src/mocks/gov-tips.ts");

const at = { when: "Thursday 12 November 2026, 10:00", short: "Thu 12 Nov, 10:00", iso: "2026-11-12T10:00" };
const tip = (level, over = {}) => ({ ...TIP_45(level), ...over });

test("PRIVACY: an officer's view of a tip has no sender identity and no private code", () => {
  for (const level of ["woreda", "subcity", "bureau"]) {
    const json = JSON.stringify(tip(level));
    assert.doesNotMatch(json, /Q7MD-42KX/, `${level} shows the private code`);
    assert.doesNotMatch(json, /phone|0911|0900|@example/i, `${level} shows contact details`);
  }
});

test("only the Woreda plans a visit", () => {
  assert.equal(applyTipAction(tip("woreda"), "woreda", { type: "plan_visit", date: "2026-11-14", officer: "Dawit Kebede", note: "Check the stalls" }, at).ok, true);
  assert.equal(applyTipAction(tip("subcity"), "subcity", { type: "plan_visit", date: "d", officer: "o", note: "n" }, at).ok, false);
  assert.equal(applyTipAction(tip("bureau"), "bureau", { type: "plan_visit", date: "d", officer: "o", note: "n" }, at).ok, false);
});

test("only the Sub-City sends a tip to a Woreda, and it then sits with that Woreda", () => {
  const r = applyTipAction(tip("subcity"), "subcity", { type: "send_to_woreda", woreda: "Woreda 7", note: "" }, at);
  assert.equal(r.ok, true);
  assert.equal(r.next.holder, "Woreda 7");
  assert.equal(applyTipAction(tip("woreda"), "woreda", { type: "send_to_woreda", woreda: "Woreda 5", note: "" }, at).ok, false);
});

test("making a tip a case happens once, keeps the sender anonymous and ends further actions", () => {
  const r = applyTipAction(tip("woreda"), "woreda", { type: "make_case", category: "Price above the official ceiling", caseRef: "CC-2026-00152" }, at);
  assert.equal(r.ok, true);
  assert.equal(r.next.caseRef, "CC-2026-00152");
  assert.match(r.next.history[0].text, /anonymous/);
  assert.equal(applyTipAction(r.next, "woreda", { type: "close", result: "Closed, no action", note: "" }, at).ok, false);
});

test("a closed tip takes no more actions", () => {
  const closed = applyTipAction(tip("woreda"), "woreda", { type: "close", result: "Closed, action taken", note: "Stall warned" }, at).next;
  assert.equal(closed.closed, true);
  assert.equal(applyTipAction(closed, "woreda", { type: "make_case", category: "x", caseRef: "CC-2026-00153" }, at).ok, false);
});
