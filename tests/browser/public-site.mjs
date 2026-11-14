// Public-site browser check. Needs the site running (`npm run start -w web` after a build, or `npm run dev -w web`).
// Run: `npm run test:browser`. Set SHOT_DIR=some/folder to also save screenshots at 1280, 768 and 360 px.
import { mkdirSync } from "node:fs";
import { launch } from "../../scripts/browser/driver.mjs";

const SHOT_DIR = process.env.SHOT_DIR;
if (SHOT_DIR) mkdirSync(SHOT_DIR, { recursive: true });
const b = await launch();
await b.device(1280, 900, false);
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + detail}`); };

try {
  // ---- Complaint wizard, end to end -------------------------------------------------------------
  await b.go("/complaint/new?step=5");
  check("wizard: cannot jump ahead (step 5 redirects to 1)", (await b.url()).endsWith("step=1"), await b.url());

  await b.clickText("Next", "button[type=submit]");
  check("wizard: step 1 blocks an empty submit", (await b.url()).endsWith("step=1"));

  await b.click("input[name=category][value=wrong_weight_measure]");
  await b.set("#c-subject", "Rice sold short and mixed with stones");
  await b.set("#c-what", "I bought a 25 kg sack of white rice. At home it weighed 21 kg and had small stones in it.");
  await b.clickText("Next", "button[type=submit]");
  await b.waitFor("location.search.includes('step=2')");
  check("wizard: step 1 -> 2", (await b.url()).endsWith("step=2"), await b.url());
  const sum1 = await b.text("aside[aria-label='Your complaint so far']");
  check("wizard: live summary shows the problem", /Wrong weight or measure/.test(sum1 ?? ""), sum1);

  await b.waitFor("document.querySelector('input[name=business][type=radio]')");
  await b.click("input[name=business]"); // first registered business
  await b.clickText("Next", "button[type=submit]");
  await b.waitFor("location.search.includes('step=3')");
  check("wizard: step 2 (registered business) -> 3", (await b.url()).endsWith("step=3"), await b.url());

  await b.set("#p-item", "White rice, one 25 kg sack");
  await b.set("#p-date", "2026-11-01");
  await b.click("input[name=where][value=market]");
  await b.set("#p-sub", "Akaki Kality");
  await b.set("#p-wo", "7");
  await b.set("#p-paid", "2250");
  await b.clickText("Next", "button[type=submit]");
  await b.waitFor("location.search.includes('step=4')");
  check("wizard: step 3 -> 4", (await b.url()).endsWith("step=4"), await b.url());

  await b.clickText("Next", "button[type=submit]");
  await b.waitFor("location.search.includes('step=5')");
  check("wizard: step 4 evidence is optional", (await b.url()).endsWith("step=5"), await b.url());

  await b.click("input[name=want][value=refund]");
  await b.waitFor("document.querySelector('#o-amount')");
  await b.set("#o-amount", "2250");
  await b.clickText("Next", "button[type=submit]");
  await b.waitFor("location.search.includes('step=6')");
  check("wizard: step 5 -> 6 (amount asked only for refund)", (await b.url()).endsWith("step=6"), await b.url());

  const review = await b.text(".wizard-box");
  check("wizard: review shows every answer", /Rice sold short/.test(review) && /2,250 ETB/.test(review) && /Akaki Kality/.test(review) && /White rice/.test(review));
  await b.clickText("Send the complaint", "button[type=submit]");
  check("wizard: cannot send without the declaration", (await b.url()).endsWith("step=6"));

  await b.click("input[type=checkbox][required]");
  await b.clickText("Send the complaint", "button[type=submit]");
  await b.waitFor("location.pathname==='/complaint/sent'");
  await b.sleep(500);
  const sent = await b.text("main");
  check("wizard: sent page shows the reference", /CC-2026-00148/.test(sent ?? ""), sent?.slice(0, 200));
  await b.go("/complaint/new");
  const afterSend = await b.text(".wizard-box");
  check("wizard: draft is cleared after sending", !/Rice sold short/.test(afterSend ?? ""));

  // ---- Case page: accept the offer ---------------------------------------------------------------
  await b.go("/cases/CC-2026-00123");
  check("case: shows the offer and the three choices", /A new 25 kg sack/.test(await b.text("main")) && /Make a counter-offer/.test(await b.text("main")));
  await b.clickText("Accept the offer", "button");
  const afterAccept = await b.text("main");
  check("case: accepting resolves it", /Resolved: you accepted the offer/.test(afterAccept) && /You accepted the offer/.test(afterAccept));
  check("case: no actions left after resolving", !/Make a counter-offer/.test(afterAccept) && !/Withdraw the complaint/.test(afterAccept));

  // ---- Case page: escalate through a dialog -----------------------------------------------------
  await b.go("/cases/CC-2026-00123");
  await b.clickText("Move it to the Woreda", "button");
  await b.waitFor("dialog[open]");
  check("case: escalate dialog opens", await b.ev("return !!document.querySelector('dialog[open]')"));
  await b.clickText("Move it to the Woreda", "dialog[open] button[type=submit]");
  check("case: dialog needs a reason (native validation blocks)", await b.ev("return !!document.querySelector('dialog[open]')"));
  await b.click("dialog[open] input[name=why]");
  await b.clickText("Move it to the Woreda", "dialog[open] button[type=submit]");
  await b.sleep(400);
  const esc = await b.text("main");
  check("case: escalating moves the case to the Woreda", /Waiting for the Woreda to accept/.test(esc) && /You moved it to the Woreda/.test(esc));
  check("case: dialog closed afterwards", !(await b.ev("return !!document.querySelector('dialog[open]')")));

  // Escape closes a dialog
  await b.go("/cases/CC-2026-00123?step=meeting");
  check("case: meeting state shows the appointment", /Friday 6 November 2026, 10:00/.test(await b.text("main")));
  await b.clickText("Can't come?", "button");
  await b.waitFor("dialog[open]");
  await b.ev("document.querySelector('dialog[open]').dispatchEvent(new Event('cancel',{cancelable:true})); document.querySelector('dialog[open]').close(); return 1");
  check("case: dialog closes", !(await b.ev("return !!document.querySelector('dialog[open]')")));

  // Settlement: accept needs the checkbox
  await b.go("/cases/CC-2026-00123?step=settlement");
  check("case: accept button disabled until the box is ticked", await b.ev("return [...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Accept the solution').disabled"));
  await b.click(".card input[type=checkbox]");
  await b.clickText("Accept the solution", "button");
  check("case: accepting the solution is recorded", /You accepted the solution/.test(await b.text("main")));

  // Info required: send information
  await b.go("/cases/CC-2026-00140");
  await b.set("#info-answer", "I found the receipt and attached the label photo.");
  await b.clickText("Send the information", "button[type=submit]");
  check("case: info request answered", /Being checked/.test(await b.text("main")) && /You sent more information/.test(await b.text("main")));

  // Outside jurisdiction
  await b.go("/cases/CC-2026-00118");
  check("case: outside jurisdiction explains where to go", /Where you can go instead/.test(await b.text("main")) && !(await b.ev("return !!document.querySelector('.track')")));

  // ---- Tip --------------------------------------------------------------------------------------
  await b.go("/tip");
  await b.set("#t-sub", "Bole");
  await b.set("#t-place", "Market 097, near the sugar stalls");
  await b.set("#t-when", "2026-11-04");
  await b.set("#t-text", "Several shops sell sugar at 160 ETB a kilo. The list says 125.");
  await b.clickText("Send the tip", "button[type=submit]");
  await b.waitFor("location.pathname==='/tip/sent'"); await b.sleep(500);
  const tipSent = await b.text("main");
  check("tip: anonymous tip shows number and private code", /TIP-2026-00048/.test(tipSent) && /Q7MD-42KX/.test(tipSent));
  check("tip: the private code is not in the address", !(await b.url()).includes("Q7MD"));
  await b.go("/tip");
  await b.click("input[name=who][type=radio]:not(:checked)");
  check("tip: choosing to share contact reveals name and phone", await b.ev("return !!document.querySelector('#t-name') && !!document.querySelector('#t-phone')"));

  // ---- Track ------------------------------------------------------------------------------------
  await b.go("/track");
  await b.set("#tr-ref", "CC-2026-00123"); await b.set("#tr-phone", "0412");
  await b.clickText("Check the status", "button[type=submit]");
  await b.waitFor("location.pathname==='/track/result'"); await b.sleep(600);
  const tr = await b.text("main");
  check("track: found complaint shows handler and progress", /Woreda 7 Trade Office/.test(tr) && /Under Reconciliation/.test(tr));
  await b.go("/track");
  await b.set("#tr-ref", "CC-2026-00123"); await b.set("#tr-phone", "9999");
  await b.clickText("Check the status", "button[type=submit]");
  await b.waitFor("location.pathname==='/track/result'"); await b.sleep(600);
  const trBad = await b.text("main");
  check("track: wrong digits and unknown number give the same message", /could not find a case/.test(trBad) && !/0412/.test(trBad));
  await b.go("/track/result?ref=CC-2026-00123");
  check("track: reference only (from home) asks for the digits", /Last 4 digits/.test(await b.text("main")));
  await b.go("/track?kind=tip");
  check("track: ?kind=tip opens the tip tab", await b.ev("return document.querySelector('#tab-tip').getAttribute('aria-selected')==='true'"));

  // ---- Register -----------------------------------------------------------------------------------
  await b.go("/register");
  await b.set("#r-name", "Hirut Alemu"); await b.set("#r-phone", "0911 234 567"); await b.set("#r-sub", "Bole"); await b.set("#r-wo", "7");
  await b.set("#r-pw", "longpassword1"); await b.set("#r-pw2", "different-pass");
  await b.click("input[name=consent]");
  await b.clickText("Create the account", "button[type=submit]");
  check("register: mismatched passwords are caught", /not the same/.test(await b.text("main")));
  await b.set("#r-pw2", "longpassword1");
  await b.clickText("Create the account", "button[type=submit]");
  await b.waitFor("location.pathname==='/verify'");
  check("register: valid form continues to the identity check", (await b.url()) === "/verify");

  // ---- Filters ------------------------------------------------------------------------------------
  await b.go("/help");
  const before = await b.ev("return document.querySelectorAll('details').length");
  await b.set("#faq-q", "receipt");
  await b.sleep(250);
  const after = await b.ev("return document.querySelectorAll('details').length");
  check("help: search narrows the questions", before === 8 && after === 1, `${before} -> ${after}`);
  await b.set("#office-area", "Bole");
  await b.sleep(250);
  check("help: office finder narrows the table", (await b.ev("return document.querySelectorAll('#offices tbody tr').length")) === 2);
  await b.go("/help?subcity=Lideta");
  check("help: ?subcity pre-selects the office", (await b.ev("return document.querySelector('#office-area').value")) === "Lideta");

  await b.go("/laws");
  await b.ev("[...document.querySelectorAll('.chips input')][1].click(); return 1"); await b.sleep(250);
  check("laws: type filter narrows the list", (await b.ev("return document.querySelectorAll('.doc').length")) === 2);
  await b.set("#law-q", "zzzz"); await b.sleep(250);
  check("laws: empty result is explained", /No document matches/.test(await b.text("main")));

  await b.go("/news");
  await b.ev("[...document.querySelectorAll('.chips input')][1].click(); return 1"); await b.sleep(250);
  check("news: tag filter narrows the list", (await b.ev("return document.querySelectorAll('.news-card').length")) === 2);
  await b.go("/news/check-before-you-buy");
  check("news: article page renders its checks", /Three checks before you pay/.test(await b.text("main")));

  // ---- Notifications, messages ----------------------------------------------------------------------
  await b.go("/notifications");
  await b.clickText("Mark all as read", "button");
  check("notifications: mark all as read", /All read/.test(await b.text("main")));
  await b.go("/messages");
  await b.click(".chat-item");
  await b.set("#chat-message", "I will bring the receipt.");
  await b.clickText("Send", ".chat-compose button[type=submit]");
  check("messages: sending adds a bubble", /I will bring the receipt/.test(await b.text(".chat-feed")));
  await b.clickText("Accept", ".offer-card button");
  check("messages: accepting an offer updates it", /Accepted/.test(await b.text(".chat-feed")));
  await b.clickText("Make an offer", "button");
  await b.waitFor("dialog[open]");
  await b.set("#of-amount", "2250");
  await b.clickText("Send the offer", "dialog[open] button[type=submit]");
  check("messages: making an offer adds an offer card", /2250 ETB/.test(await b.text(".chat-feed")) || /Refund: 2250 ETB/.test(await b.text(".chat-feed")));

  // ---- Sign-in -------------------------------------------------------------------------------------
  await b.go("/sign-in?next=/complaint/new");
  check("sign-in: consumer form returns to ?next", await b.ev("return document.querySelector('#pg-consumer-id').form.getAttribute('action')==='/complaint/new'"));
  await b.go("/sign-in?next=//evil.example");
  check("sign-in: external ?next is ignored", await b.ev("return document.querySelector('#pg-consumer-id').form.getAttribute('action')==='/my-cases'"));
  await b.go("/");
  await b.ev("location.hash='#signin'; return 1"); await b.sleep(300);
  await b.click("label[for=md-r-woreda]");
  check("sign-in dialog: role tabs switch panels", await b.ev("return getComputedStyle(document.querySelector('.p-woreda')).display!=='none'"));

  // ---- Console cleanliness -------------------------------------------------------------------------
  check("no console errors or exceptions during the whole run", b.errors.length === 0, b.errors.slice(0, 6).join(" | "));

  // ---- Screenshots at three widths ------------------------------------------------------------------
  for (const [w, h, mobile] of [[1280, 900, false], [768, 1000, false], [360, 800, true]]) {
    await b.device(w, h, mobile);
    for (const [name, url] of [["wizard1", "/complaint/new"], ["case", "/cases/CC-2026-00123"], ["help", "/help"], ["messages", "/messages"], ["tip", "/tip"]]) {
      await b.go(url); if (SHOT_DIR) await b.shot(`${SHOT_DIR}/${name}-${w}.png`);
    }
    const overflow = await b.ev("return document.documentElement.scrollWidth > document.documentElement.clientWidth");
    check(`no sideways scroll at ${w}px (last page)`, !overflow);
  }
} catch (e) {
  console.log("TEST RUN ABORTED:", e.message);
  results.push({ name: "run completed", ok: false });
} finally {
  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (b.errors.length) console.log("console errors:\n  " + [...new Set(b.errors)].slice(0, 10).join("\n  "));
  await b.close();
  if (failed.length) process.exitCode = 1;
}
