import test from "node:test";
import assert from "node:assert/strict";
import { asPhone } from "../web/src/lib/auth-client.ts";
import { safeNext } from "../web/src/lib/safe-next.ts";
import { DEV_TEST_ACCOUNTS, ROLES } from "@consumer-rights/contracts";

test("asPhone turns the ways people write a mobile number into one international form", () => {
  assert.equal(asPhone("0911234567"), "+251911234567");
  assert.equal(asPhone("0911 234 567"), "+251911234567");
  assert.equal(asPhone("+251 911 234 567"), "+251911234567");
  assert.equal(asPhone("0711-234-567"), "+251711234567");
  assert.equal(asPhone("officer.woreda7@example.com"), null);
  assert.equal(asPhone("12345"), null);
});

test("safeNext accepts only same-site paths", () => {
  assert.equal(safeNext("/notifications"), "/notifications");
  assert.equal(safeNext("//evil.example"), undefined);
  assert.equal(safeNext("https://evil.example"), undefined);
  assert.equal(safeNext(String.fromCharCode(47, 92) + "evil"), undefined);
  assert.equal(safeNext(undefined), undefined);
});

test("every test account has a real role, a matching portal and a unique phone and email", () => {
  const phones = new Set(), emails = new Set();
  for (const a of DEV_TEST_ACCOUNTS) {
    assert.ok(ROLES[a.role], `${a.key}: unknown role`);
    assert.equal(ROLES[a.role].portal, a.portal, `${a.key}: portal does not match its role`);
    assert.equal(a.office === null, ROLES[a.role].level === null || ROLES[a.role].level === "business", `${a.key}: office does not match its role`);
    assert.match(a.phone, /^\+251[79]\d{8}$/);
    phones.add(a.phone); emails.add(a.email);
  }
  assert.equal(phones.size, DEV_TEST_ACCOUNTS.length);
  assert.equal(emails.size, DEV_TEST_ACCOUNTS.length);
  assert.ok(["consumer", "business", "woreda", "subcity", "bureau"].every(p => DEV_TEST_ACCOUNTS.some(a => a.portal === p)), "every portal has a test account");
});
