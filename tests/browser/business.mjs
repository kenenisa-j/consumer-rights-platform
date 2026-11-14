// Business desk browser check. Needs the site running; see public-site.mjs.
// Run: `npm run test:browser:business`. Set SHOT_DIR=some/folder to save screenshots.
import { mkdirSync } from "node:fs";
import { launch } from "../../scripts/browser/driver.mjs";

const SHOT_DIR = process.env.SHOT_DIR;
if (SHOT_DIR) mkdirSync(SHOT_DIR, { recursive: true });
const b = await launch();
await b.device(1280, 900, false);
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + detail}`); };
const main = () => b.text(".ws-content");
const EXPECTED_404 = ["/business/nope"];
const realErrors = () => b.errors.filter(e => !EXPECTED_404.some(u => e.includes(u)));
const openDialog = async label => { await b.clickText(label, "button"); await b.waitFor("dialog[open]"); };
const submitDialog = async label => { await b.clickText(label, "dialog[open] button[type=submit]"); await b.sleep(400); };

try {
  // ---- Sign in as a business, from the public site -------------------------------------------------
  await b.go("/sign-in");
  await b.click("label[for=pg-r-business]");
  await b.set("#pg-business-id", "gebriel.grain@example.com");
  await b.set("#pg-business-pw", "a-secret-password-1");
  await b.ev("document.querySelector('#pg-business-pw').form.requestSubmit(); return 1");
  await b.waitFor("location.pathname==='/business/overview'");
  const landed = await b.url();
  check("sign-in: the Business sign-in lands on the business desk", landed.startsWith("/business/overview"), landed);
  check("sign-in: nothing typed (password, email) is put in the address", landed === "/business/overview", landed);

  // ---- Shell and menu ----------------------------------------------------------------------------------
  check("overview: greets the business and flags the waiting complaint", /Good morning, Gebriel/.test(await main()) && /CC-2026-00123 is waiting/.test(await main()));
  check("rail: 6 links, Business desk", (await b.ev("return document.querySelectorAll('.rail nav a').length")) === 6 && (await b.text(".rail__brand")).includes("Business desk"));
  await b.go("/business/stock");
  check("stock, orders, profile say they belong to the AddisB2B desk (no 404)", /part of the AddisB2B business desk/.test(await main()));
  await b.go("/business/nope");
  check("an unknown business page is a 404", /404|could not be found/i.test(await b.text("body")));

  // ---- Complaints list -------------------------------------------------------------------------------------
  await b.go("/business/complaints");
  check("complaints: 3 rows, the consumer is only a number", (await b.ev("return document.querySelectorAll('tbody tr').length")) === 3 && /Consumer 00123/.test(await main()) && !/Hirut/.test(await main()));
  await b.ev("[...document.querySelectorAll('.chips input')][1].click(); return 1"); await b.sleep(250);
  check("complaints: 'Reply needed' filter", (await b.ev("return document.querySelectorAll('tbody tr').length")) === 1);

  // ---- Case page: privacy and the first reply ---------------------------------------------------------------
  await b.go("/business/complaints/CC-2026-00123");
  const first = await b.text("body");
  check("PRIVACY: no consumer name, phone or email on the page", !/Hirut|Alemu|0900 000 412|hirut\.alemu|@example\.com/i.test(first.replace("gebriel.grain@example.com", "")));
  check("PRIVACY: the consumer is 'Consumer 00123' and the limited view is explained", /Consumer 00123/.test(first) && /Limited view/.test(first));
  check("reply: the deadline is shown", /Please reply by Wednesday 4 November 2026, 09:40/.test(first));
  check("reply: the form is shown for a complaint awaiting a reply", await b.ev("return !!document.querySelector('#rp-explanation')"));
  await b.clickText("Send my reply", "button[type=submit]");
  check("reply: an empty form is blocked", /Reply to the consumer/.test(await main()) && await b.ev("return !!document.querySelector('#rp-explanation')"));
  await b.type("#rp-explanation", "Too short");
  await b.click("input[name=position][value=accept]"); await b.click("input[name=offer][value=refund]");
  check("reply: choosing a refund asks for the amount", await b.ev("return !!document.querySelector('#rp-amount')"));
  await b.set("#rp-amount", "2250");
  await b.click("input[name=confirm]");
  await b.clickText("Send my reply", "button[type=submit]");
  check("reply: an explanation under 20 characters is blocked", await b.ev("return !!document.querySelector('#rp-explanation')"));
  await b.type("#rp-explanation", "We are sorry. The sacks come from our supplier and we did not weigh each one.");
  await b.clickText("Send my reply", "button[type=submit]");
  const afterReply = await main();
  check("reply: sent, status waiting, form gone", /Waiting for the consumer/.test(afterReply) && /Your reply was sent to the consumer/.test(afterReply) && !(await b.ev("return !!document.querySelector('#rp-explanation')")));
  check("reply: recorded in the history and the thread", /You replied/.test(afterReply) && /I offer a refund of 2250 ETB/.test(afterReply));

  // ---- The consumer answered ---------------------------------------------------------------------------------------
  await b.go("/business/complaints/CC-2026-00123?step=answer");
  check("answer: the three choices are offered", /Offer the full refund/.test(await main()) && /Make a different offer/.test(await main()) && /Keep my offer/.test(await main()));
  await openDialog("Offer the full refund");
  await submitDialog("Offer the refund");
  const afterRefund = await main();
  check("answer: offering the refund is recorded", /You offered the refund/.test(afterRefund) && /Waiting for the consumer/.test(afterRefund));
  await b.go("/business/complaints/CC-2026-00123?step=answer");
  await openDialog("Keep my offer");
  await submitDialog("Keep my offer");
  check("answer: keeping the offer is recorded", /Offer kept/.test(await main()));
  await b.go("/business/complaints/CC-2026-00123?step=answer");
  await openDialog("Make a different offer");
  await b.click("dialog[open] input[name=kind]");
  await b.set("#do-message", "We can offer part of the money back and a checked sack.");
  await submitDialog("Send the offer");
  check("answer: a different offer is recorded", /You made a different offer/.test(await main()));

  // ---- Agreed, government holds it, settlement, resolved ----------------------------------------------------------------
  await b.go("/business/complaints/CC-2026-00123?step=agreed");
  check("agreed: shows what was agreed", /2,250 ETB to the consumer/.test(await main()) && /Confirm you paid/.test(await main()));
  await b.set("#cp-date", "2026-11-05");
  await b.clickText("Confirm and send", "button[type=submit]");
  check("agreed: confirming payment closes the direct agreement", /The consumer was asked to confirm/.test(await main()));
  await b.go("/business/complaints/CC-2026-00123?step=woreda");
  const wo = await main();
  check("with the Woreda: shows what the office may ask of the business", /may ask of you/.test(wo) && /A meeting with the consumer/.test(wo) && /Meron Tadesse/.test(wo));
  await b.set("#wo-message", "We will attend the meeting.");
  await b.clickText("Send", "button[type=submit]");
  check("with the Woreda: writing to the officer works", /message was sent to the officer/.test(await main()));
  await b.go("/business/complaints/CC-2026-00123?step=settlement");
  check("settlement: the confirm button is disabled until proof is added", await b.ev("return [...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Confirm and send').disabled") && /signed refund receipt/.test(await main()));
  await b.go("/business/complaints/CC-2026-00123?step=resolved");
  check("resolved: nothing left to do", !(await b.ev("return !!document.querySelector('form')")) && /The refund was paid/.test(await main()));

  // ---- Messages ---------------------------------------------------------------------------------------------------------------
  await b.go("/business/messages");
  check("messages: 4 conversations, the consumer is a number", (await b.ev("return document.querySelectorAll('.chat-item').length")) === 4 && /Consumer 00123/.test(await b.text(".chat-list")));
  await b.click(".chat-item");
  await b.clickText("Accept", ".offer-card button");
  check("messages: the Bureau's proposal can be accepted", /Accepted/.test(await b.text(".chat-feed")));
  check("messages: 'Open the case' goes to the business case page", (await b.ev("return [...document.querySelectorAll('.chat-pane a')].find(a=>a.textContent.includes('Open the case')).getAttribute('href')")) === "/business/complaints/CC-2026-00123");
  await b.ev("[...document.querySelectorAll('.chat-item')][3].click(); return 1"); await b.sleep(250);
  check("messages: an ended conversation is read-only with a reason", /direct talk ended/.test(await b.text(".chat-pane")) && !(await b.ev("return !!document.querySelector('#chat-message')")));

  // ---- Phone ------------------------------------------------------------------------------------------------------------------------
  await b.device(360, 800, true);
  for (const url of ["/business/overview", "/business/complaints", "/business/complaints/CC-2026-00123", "/business/complaints/CC-2026-00123?step=answer", "/business/messages"]) {
    await b.go(url);
    if (SHOT_DIR) await b.shot(`${SHOT_DIR}/${url.replace(/\W+/g, "-")}-360.png`);
    check(`phone: no sideways scroll on ${url}`, !(await b.ev("return document.documentElement.scrollWidth > document.documentElement.clientWidth")));
  }
  await b.device(1280, 900, false);
  for (const url of ["/business/complaints/CC-2026-00123", "/business/complaints/CC-2026-00123?step=answer"]) { await b.go(url); if (SHOT_DIR) await b.shot(`${SHOT_DIR}/${url.replace(/\W+/g, "-")}-1280.png`); }

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
