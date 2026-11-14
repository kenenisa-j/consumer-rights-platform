// Real authentication, end to end: needs the web app AND the API running against the seeded database
// (`npm run db:up`, `npm run db:migrate`, `npm run db:seed`, `npm run dev:api`). The API's PUBLIC_URL must be the
// address of the site under test, because the API checks the Origin of sign-in requests.
// Run: TEST_BASE_URL=http://localhost:3300 node tests/browser/auth.mjs
import { execFileSync } from "node:child_process";
import { DEV_TEST_ACCOUNTS, DEV_TEST_PASSWORD } from "@consumer-rights/contracts";
import { launch } from "../../scripts/browser/driver.mjs";

const b = await launch();
b.autoLogin = false; // this suite signs in and out through the real forms
await b.device(1280, 900, false);
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + detail}`); };
const LANDING = { consumer: "/my-cases", business: "/business/overview", woreda: "/woreda/dashboard", subcity: "/subcity/dashboard", bureau: "/bureau/dashboard" };
const path = () => b.url();

/** Signs in through the real form: tab, test-account dropdown, submit. */
async function signInThroughForm(account) {
  await b.go("/sign-in");
  await b.click(`label[for=pg-r-${account.portal}]`);
  await b.set(`#pg-${account.portal}-test`, account.key);
  await b.sleep(200);
  await b.click(`main .p-${account.portal} form button[type=submit]`);
  const landed = await b.waitFor(`location.pathname==='${LANDING[account.portal]}' || /Too many/.test(document.body.innerText)`);
  if (landed && (await path()).startsWith("/sign-in")) {
    // The API limits sign-ins to a few every 10 seconds (Better Auth default). Wait and try once more, like a person would.
    await b.sleep(11000);
    await b.click(`main .p-${account.portal} form button[type=submit]`);
    await b.waitFor(`location.pathname==='${LANDING[account.portal]}'`);
  }
}
async function signOutThroughMenu() {
  await b.go("/");
  await b.click("details.account summary");
  await b.clickText("Sign out", "button");
  await b.waitFor("location.pathname==='/' && !document.querySelector('details.account')");
}

try {
  // ---- Guards when signed out ------------------------------------------------------------------
  for (const p of ["/my-cases", "/notifications", "/messages", "/complaint/new", "/woreda/dashboard", "/business/overview", "/bureau/cases"]) {
    await b.go(p);
    check(`signed out: ${p} goes to sign-in and remembers the page`, (await path()).startsWith("/sign-in?next="), await path());
  }
  await b.go("/");
  check("signed out: the header offers Register and Sign in", await b.ev("return !!document.querySelector('a[href=\"/register\"]') && !document.querySelector('details.account')"));

  await b.go("/");
  await b.ev("location.hash='#signin'; return 1"); await b.sleep(300);
  await b.click("label[for=md-r-woreda]");
  check("sign-in dialog: role tabs switch panels", await b.ev("return getComputedStyle(document.querySelector('.p-woreda')).display!=='none'"));
  check("sign-in dialog: also offers the test accounts", await b.ev("return document.querySelectorAll('#md-woreda-test option').length===3"));

  // ---- The test-account dropdown ---------------------------------------------------------------
  await b.go("/sign-in");
  const options = await b.ev("return [...document.querySelectorAll('#pg-woreda-test option')].map(o=>o.textContent)");
  check("test accounts: the Woreda tab lists its officer and administrator", options.length === 3 && /officer/i.test(options[1]) && /administrator/i.test(options[2]), JSON.stringify(options));
  await b.click("label[for=pg-r-woreda]");
  await b.set("#pg-woreda-test", "woreda_admin");
  await b.sleep(200);
  const filled = await b.ev("return [document.querySelector('#pg-woreda-id').value, document.querySelector('#pg-woreda-pw').value.length]");
  const admin = DEV_TEST_ACCOUNTS.find(a => a.key === "woreda_admin");
  check("test accounts: choosing one fills the sign-in fields", filled[0] === admin.identifier && filled[1] === DEV_TEST_PASSWORD.length, JSON.stringify(filled));
  check("test accounts: the sign-in form has no name attributes (nothing goes in the address)", await b.ev("return ![...document.querySelectorAll('.roles input:not([type=radio]), .roles select')].some(e=>e.name)"));

  // ---- The "Who are you?" doors open sign-in on the right tab and end in that portal -------------------
  for (const [label, portal, key] of [["Business", "business", "business"], ["Sub-City", "subcity", "subcity_coordinator"], ["City Bureau", "bureau", "bureau_officer"]]) {
    await b.go("/");
    await b.clickText(label, "a.door");
    await b.waitFor("document.querySelector('dialog.dlg[open]')", 20000);
    check(`door "${label}": opens the sign-in dialog on the ${portal} tab`, await b.ev(`return !!document.querySelector('dialog.dlg[open]') && document.querySelector('dialog.dlg[open] input[data-role="${portal}"]').checked`), await path());
    await b.set(`dialog.dlg[open] #rm-${portal}-test`, key);
    await b.sleep(200);
    await b.click(`dialog.dlg[open] .p-${portal} form button[type=submit]`);
    await b.waitFor(`location.pathname==='${LANDING[portal]}'`, 20000);
    check(`door "${label}": after signing in the person is in the ${portal} portal`, (await path()) === LANDING[portal], await path());
    await b.go("/"); await signOutThroughMenu().catch(() => {});
  }

  // ---- Wrong password, wrong tab -----------------------------------------------------------------
  await b.sleep(11000); // the API allows only a few sign-ins every 10 seconds
  await b.go("/sign-in");
  await b.click("label[for=pg-r-woreda]");
  await b.set("#pg-woreda-test", "woreda_admin");
  await b.sleep(200);
  await b.set("#pg-woreda-pw", "not-the-password");
  await b.click("main .p-woreda form button[type=submit]");
  await b.waitFor("document.querySelector('main .p-woreda .error-text.show')");
  check("wrong password: one plain message, still on the sign-in page", /not right/.test(await b.text("main .p-woreda .error-text.show")) && (await path()).startsWith("/sign-in"));
  await b.click("label[for=pg-r-consumer]");
  await b.set("#pg-consumer-id", admin.identifier);
  await b.set("#pg-consumer-pw", DEV_TEST_PASSWORD);
  await b.click("main .p-consumer form button[type=submit]");
  await b.waitFor("document.querySelector('main .p-consumer .error-text.show')");
  check("wrong tab: a Woreda account on the Consumer tab is refused and told where to go", /Use the Woreda tab/.test(await b.text("main .p-consumer .error-text.show")), await b.text("main .p-consumer .error-text.show"));
  await b.go("/my-cases");
  check("wrong tab: and no session was left behind", (await path()).startsWith("/sign-in"));

  // ---- The three home-page buttons open their dialogs
  for (const [label, target] of [["Make a complaint", "/complaint-or-tip"], ["Track a case", "/track"]]) {
    await b.go("/");
    await b.clickText(label, "a.btn");
    await b.waitFor(`location.pathname==='${target}'`, 20000);
    check(`home button "${label}" opens its dialog (${target})`, await b.ev("return !!document.querySelector('dialog.dlg[open]')"), await path());
  }
  await b.go("/");
  await b.click("a[href=\"/tip\"].btn, .quick-links a[href=\"/tip\"]");
  await b.waitFor("location.pathname==='/tip'", 20000);
  check("home button \"Report unfair trade\" opens the tip form dialog", await b.ev("return !!document.querySelector('dialog.dlg[open] #t-place')"), await path());

  // ---- Every test account signs in to its own area ----------------------------------------------
  for (const a of DEV_TEST_ACCOUNTS) {
    await signInThroughForm(a);
    check(`${a.key}: signs in and lands on ${LANDING[a.portal]}`, (await path()) === LANDING[a.portal], await path());
    const shown = a.portal === "consumer" ? await b.text("main") : await b.text(".topbar__who");
    const expectedName = a.portal === "business" ? "Gebriel Grain Traders" : a.fullName;
    check(`${a.key}: the page shows who is signed in`, shown.includes(a.portal === "consumer" ? a.fullName.split(" ")[0] : expectedName), shown.slice(0, 80));
    if (a.portal !== "consumer") {
      await b.go("/my-cases");
      check(`${a.key}: is kept out of the consumer area`, (await path()).startsWith("/no-access"), await path());
    }
    const other = a.portal === "bureau" ? "/woreda/dashboard" : "/bureau/dashboard";
    await b.go(other);
    check(`${a.key}: is kept out of ${other}`, (await path()).startsWith("/no-access"), await path());
    await signOutThroughMenu().catch(async () => { await b.go("/"); });
    await b.go("/my-cases");
    check(`${a.key}: after signing out the session is gone`, (await path()).startsWith("/sign-in"), await path());
  }

  // ---- Return to the page that was asked for -------------------------------------------------------
  await b.go("/sign-in?next=/notifications");
  await b.set("#pg-consumer-test", "consumer");
  await b.sleep(200);
  await b.click("main .p-consumer form button[type=submit]");
  await b.waitFor("location.pathname==='/notifications'");
  check("sign-in returns to the page that was asked for", (await path()) === "/notifications", await path());
  await b.go("/sign-in?next=//evil.example");
  check("an outside return address is ignored (already signed in: header shows the account)", await b.ev("return !!document.querySelector('details.account')"));
  await signOutThroughMenu().catch(() => {});

  // ---- Registration with a real code ----------------------------------------------------------------
  const digits = String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
  const phone = `09${digits}`;
  await b.go("/register");
  await b.set("#r-name", "Test Person Created By Browser Suite");
  await b.set("#r-phone", phone);
  await b.set("#r-pw", "Another-Test-Pass-1");
  await b.set("#r-pw2", "Another-Test-Pass-1");
  await b.click("input[name=consent]");
  await b.clickText("Send me a code", "button[type=submit]");
  await b.waitFor("document.querySelector('#r-otp')");
  check("register: asking for a code moves to the code step", await b.ev("return !!document.querySelector('#r-otp')"));
  await b.set("#r-otp", "000000");
  await b.clickText("Create the account", "button[type=submit]");
  await b.waitFor("document.querySelector('.alert--bad')");
  check("register: a wrong code is refused with a plain message", /not right|run out/.test(await b.text(".alert--bad")), await b.text(".alert--bad"));
  let code; try { code = execFileSync("node", ["backend/scripts/dev-otp.mjs", phone], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).match(/([0-9]{6})\s*$/m)?.[1]; } catch (e) { console.log("dev:otp failed:", String(e.stderr || e.message).slice(0, 300)); }
  check("register: the development script can read the code", !!code);
  await b.set("#r-otp", code ?? "");
  await b.clickText("Create the account", "button[type=submit]");
  await b.waitFor("location.pathname==='/verify'");
  check("register: the right code creates the account and signs the person in", (await path()) === "/verify" && await b.ev("return !!document.querySelector('details.account')"), await path());
  await b.go("/my-cases");
  check("register: the new person sees their own name, not someone else's", /Test Person/.test(await b.text("main")), (await b.text("main")).slice(0, 80));
  await signOutThroughMenu().catch(() => {});
  await b.go("/sign-in");
  await b.set("#pg-consumer-id", phone);
  await b.set("#pg-consumer-pw", "Another-Test-Pass-1");
  await b.click("main .p-consumer form button[type=submit]");
  await b.waitFor("location.pathname==='/my-cases'");
  check("register: the new account can sign in again with its phone and password", (await path()) === "/my-cases", await path());

  check("no console errors during the run", b.errors.filter(e => !/status of (400|401|403|404|429)/.test(e)).length === 0, b.errors.filter(e => !/status of (400|401|403|404|429)/.test(e)).slice(0, 5).join(" | "));
} catch (e) {
  console.log("TEST RUN ABORTED:", e.message);
  results.push({ name: "run completed", ok: false });
} finally {
  const passed = results.filter(r => r.ok).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  if (b.errors.length) console.log("console errors:\n  " + [...new Set(b.errors)].slice(0, 8).join("\n  "));
  await b.close();
  process.exit(passed === results.length ? 0 : 1);
}
