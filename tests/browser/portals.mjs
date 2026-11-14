// Government portal browser check (Woreda, Sub-City, City Bureau). Needs the site running; see public-site.mjs.
// Run: `npm run test:browser:portals`. Set SHOT_DIR=some/folder to save screenshots.
import { mkdirSync } from "node:fs";
import { launch } from "../../scripts/browser/driver.mjs";

const SHOT_DIR = process.env.SHOT_DIR;
if (SHOT_DIR) mkdirSync(SHOT_DIR, { recursive: true });
const b = await launch();
await b.device(1280, 900, false);
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + detail}`); };
const main = () => b.text(".ws-content");
const EXPECTED_404 = ["/nope/dashboard", "/woreda/cases/CC-2026-99999", "/woreda/not-a-page"];
const realErrors = () => b.errors.filter(e => !EXPECTED_404.some(u => e.includes(u)));
const openTab = async name => { await b.clickText(name, "[role=tab]"); await b.sleep(250); };
const openDialog = async label => { await b.clickText(label, "button"); await b.waitFor("dialog[open]"); };
const submitDialog = async label => { await b.clickText(label, "dialog[open] button[type=submit]"); await b.sleep(400); };

try {
  // ---- The workspace look and the shared shell ----------------------------------------------------
  for (const [level, portal] of [["woreda", "Woreda portal"], ["subcity", "Sub-City portal"], ["bureau", "City Bureau portal"]]) {
    await b.go(`/${level}/dashboard`);
    check(`${level}: dashboard opens with the ${portal} rail`, (await b.text(".rail__brand")).includes(portal));
    check(`${level}: rail has the full menu (12 links)`, (await b.ev("return document.querySelectorAll('.rail nav a').length")) === 12);
    check(`${level}: current page is marked`, (await b.ev("return document.querySelector('.rail a[aria-current=page]')?.textContent.trim()")).startsWith("Dashboard"));
  }
  await b.go("/woreda/dashboard");
  check("workspace uses the navy theme, not the public green", await b.ev("return getComputedStyle(document.body).backgroundColor==='rgb(243, 245, 248)' && !!document.querySelector('.ws-shell')"));
  check("the public header is not on a portal page", !(await b.ev("return !!document.querySelector('.site-header')")));
  await b.go("/");
  check("workspace styles do not leak into the public site", await b.ev("return !!document.querySelector('.site-header') && !document.body.classList.contains('ws') && getComputedStyle(document.body).backgroundColor==='rgb(251, 250, 246)'"));
  await b.go("/bureau/dashboard");
  check("bureau: shows where the open cases are", /Where the open cases are/.test(await main()) && (await b.ev("return document.querySelectorAll('.bar').length")) === 4);
  await b.go("/woreda/staff");
  check("administration pages open (no 404, no placeholder)", /Staff and roles/.test(await main()) && !/not built yet/.test(await main()));
  await b.go("/woreda/not-a-page");
  check("an unknown page inside a portal is a 404", /404|could not be found/i.test(await b.text("body")));
  await b.go("/nope/dashboard");
  check("an unknown portal is a 404", /404|could not be found/i.test(await b.text("body")));
  await b.go("/woreda/cases/CC-2026-99999");
  check("an unknown case is a 404", /404|could not be found/i.test(await b.text("body")));

  // ---- Cases list ------------------------------------------------------------------------------------
  await b.go("/woreda/cases");
  check("woreda cases: all 7 rows", (await b.ev("return document.querySelectorAll('tbody tr').length")) === 7);
  await b.ev("[...document.querySelectorAll('.chips input')][1].click(); return 1"); await b.sleep(250);
  check("woreda cases: 'Needs action' filter", (await b.ev("return document.querySelectorAll('tbody tr').length")) === 2);
  await b.ev("[...document.querySelectorAll('.chips input')][0].click(); return 1");
  await b.set("#case-q", "kettle"); await b.sleep(250);
  check("woreda cases: search by title", (await b.ev("return document.querySelectorAll('tbody tr').length")) === 1);
  await b.set("#case-q", "zzzz"); await b.sleep(250);
  check("woreda cases: empty result explained", /No case matches/.test(await main()));
  await b.go("/bureau/cases");
  check("bureau cases: filter chips are by holder", (await b.ev("return [...document.querySelectorAll('.chips label')].map(l=>l.textContent.trim()).join('|')")) === "All|At a Woreda|At a Sub-City|At the City Bureau|Closed");
  check("cases without a demo page are not links", await b.ev("return [...document.querySelectorAll('tbody tr')].some(r=>/No demo detail/.test(r.textContent))"));

  // ---- Woreda: act on the main case ---------------------------------------------------------------------
  await b.go("/woreda/cases/CC-2026-00123");
  const w = await main();
  check("woreda case: chain shows it is with the Woreda", /With you now/.test(w) && /Not on|No agreement/.test(w));
  check("woreda case: how it reached the office", /Moved up from the business/.test(w));
  check("woreda case: shows the consumer's details to staff", /Hirut Alemu/.test(w) && /0900 000 412/.test(w));
  check("woreda case: on-platform business has no 'record contact'", !/Record contact with the business/.test(w));
  check("woreda case: the refund button is disabled until a solution exists", await b.ev("return [...document.querySelectorAll('button')].find(x=>x.textContent.includes('Record the refund paid')).disabled"));

  // tabs with the keyboard
  await b.ev("document.querySelector('[role=tab]').focus(); return 1");
  await b.ev("document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})); return 1"); await b.sleep(250);
  check("tabs: ArrowRight moves to Messages", /Between the consumer/.test(await main()) && (await b.ev("return document.activeElement.textContent.trim()")) === "Messages");
  await b.ev("document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true})); return 1"); await b.sleep(250);
  check("tabs: End moves to History", /Sent to the business/.test(await main()));

  await openDialog("1. Record the visit");
  await submitDialog("Save the visit");
  check("visit: native validation keeps the dialog open when empty", await b.ev("return !!document.querySelector('dialog[open]')"));
  await b.set("#vi-time", "11:30"); await b.set("#vi-find", "Weighed four sacks, three were short.");
  await submitDialog("Save the visit");
  check("visit: saved and shown in the history", /Visit to the stall/.test(await main()) && !(await b.ev("return !!document.querySelector('dialog[open]')")));

  await openDialog("3. Propose a solution");
  await b.set("#so-amount", "2250"); await b.set("#so-by", "2026-11-12T12:00"); await b.set("#so-terms", "Refund in cash in front of the officer.");
  await submitDialog("Propose to the consumer");
  check("solution: proposed and the refund button is enabled", /Proposed solution|Solution proposed/.test(await main()) && !(await b.ev("return [...document.querySelectorAll('button')].find(x=>x.textContent.includes('Record the refund paid')).disabled")));

  // pass up one level
  await openDialog("Not resolved: pass to Akaki Kality Sub-City");
  await b.set("#pu-why", "No agreement after the meeting"); await b.set("#pu-note", "Visit findings attached. Business offers only a new sack.");
  await submitDialog("Pass to Akaki Kality Sub-City");
  const afterUp = await main();
  check("pass up: the case is now with the Sub-City", /Passed up to Akaki Kality Sub-City/.test(afterUp) && /now with the Sub-City/.test(afterUp));
  check("pass up: the Woreda has no actions left", !(await b.ev("return [...document.querySelectorAll('.actions-card button')].length")));

  // ---- Sub-City: handover note, then pass to the Bureau ---------------------------------------------------------
  await b.go("/subcity/cases/CC-2026-00123");
  const sc = await main();
  check("subcity case: shows the Woreda's handover note", /Handover note: Not resolved at the Woreda/.test(sc) && /Visit findings attached/.test(sc));
  check("subcity case: chain shows Woreda not resolved, Sub-City now", /Not resolved/.test(sc) && /With you now/.test(sc));
  await openDialog("Not resolved: pass to Addis Ababa City Bureau");
  await b.set("#pu-why", "No agreement after the meeting"); await b.set("#pu-note", "Met on 9 Nov, no agreement. Woreda notes attached.");
  await submitDialog("Pass to Addis Ababa City Bureau");
  check("pass up: Sub-City to City Bureau", /now with the City Bureau/.test(await main()));

  // ---- Bureau: last level --------------------------------------------------------------------------------------------
  await b.go("/bureau/cases/CC-2026-00123");
  const bu = await main();
  check("bureau case: has two handover notes", (bu.match(/Handover note/g) || []).length === 2);
  check("bureau case: no pass-up, only refer (the last level)", !/pass to/i.test(bu.replace(/Handover note[^]*?(?=What do you want)/, "")) && /Refer for further action/.test(bu));
  await openDialog("Refer for further action");
  await b.set("#rf-note", "The business will not honour the agreement.");
  await submitDialog("Refer the case");
  const ref = await main();
  check("bureau case: referring closes it and records the referral", /Referred to Legal office/.test(ref) && /This case is closed|Referred to Legal office/.test(ref));

  // resolve at the bureau from a fresh page via the full settlement path
  await b.go("/bureau/cases/CC-2026-00123");
  await openDialog("3. Propose a solution");
  await b.set("#so-amount", "2250"); await b.set("#so-by", "2026-11-12T12:00"); await b.set("#so-terms", "Refund in cash.");
  await submitDialog("Propose to the consumer");
  await openDialog("4. Record the refund paid");
  await b.set("#pa-time", "09:30"); await b.set("#pa-amount", "2250");
  await submitDialog("Record the refund and resolve");
  check("bureau case: recording the refund resolves it here", /Resolved here: paid/.test(await main()) && /Resolved here/.test(await main()) && /This case is closed/.test(await main()));

  // ---- Accept a new case; a business not on the platform ---------------------------------------------------------------------
  await b.go("/woreda/cases/CC-2026-00146");
  check("new case: only 'Accept and assign' is offered", (await b.ev("return [...document.querySelectorAll('.actions-card button')].map(x=>x.textContent.trim()).join('|')")) === "Accept and assign");
  await openDialog("Accept and assign");
  await submitDialog("Accept the case");
  check("new case: accepting unlocks the actions", /1\. Record the visit/.test(await main()) && /case was accepted and assigned/.test(await main()));
  await openTab("History");
  check("new case: acceptance is recorded in the history", /Accepted by the Woreda/.test(await main()));
  await b.go("/woreda/cases/CC-2026-00140");
  check("off-platform business: 'record contact' is offered", /Record contact with the business/.test(await main()));
  await openDialog("Record contact with the business");
  await b.set("#co-text", "Spoke to the shop owner, he will replace the kettle.");
  await submitDialog("Save");
  await openTab("History");
  check("off-platform business: contact is recorded in the history", /Contact with the business/.test(await main()) && /replace the kettle/.test(await main()));

  // ---- Phone: the rail becomes a drawer ----------------------------------------------------------------------------------------
  await b.device(360, 800, true);
  await b.go("/woreda/dashboard");
  check("phone: the rail is hidden until the menu is opened", (await b.ev("return getComputedStyle(document.querySelector('.rail')).display")) === "none");
  await b.click(".nav-burger");
  check("phone: the menu button opens the rail", (await b.ev("return getComputedStyle(document.querySelector('.rail')).display")) === "flex");
  await b.clickText("Cases", ".rail nav a");
  await b.waitFor("location.pathname==='/woreda/cases'"); await b.sleep(500);
  check("phone: choosing a page closes the drawer", (await b.ev("return getComputedStyle(document.querySelector('.rail')).display")) === "none");
  for (const url of ["/woreda/dashboard", "/woreda/cases", "/subcity/cases/CC-2026-00123", "/bureau/dashboard"]) {
    await b.go(url);
    if (SHOT_DIR) await b.shot(`${SHOT_DIR}/${url.replace(/\W+/g, "-")}-360.png`);
    check(`phone: no sideways scroll on ${url}`, !(await b.ev("return document.documentElement.scrollWidth > document.documentElement.clientWidth")));
  }
  await b.device(1280, 900, false);
  for (const url of ["/woreda/dashboard", "/woreda/cases/CC-2026-00123", "/subcity/dashboard", "/bureau/cases/CC-2026-00123"]) {
    await b.go(url); if (SHOT_DIR) await b.shot(`${SHOT_DIR}/${url.replace(/\W+/g, "-")}-1280.png`);
  }

  check("no console errors or exceptions during the whole run", realErrors().length === 0, realErrors().slice(0, 6).join(" | "));
} catch (e) {
  console.log("TEST RUN ABORTED:", e.message);
  results.push({ name: "run completed", ok: false });
} finally {
  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (realErrors().length) console.log("console errors:\n  " + [...new Set(realErrors())].slice(0, 10).join("\n  "));
  await b.close();
  if (failed.length) process.exitCode = 1;
}
