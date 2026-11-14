// Government portals, second part: new complaint (intake), free call line, tips, messages, reports.
// Needs the site running; see public-site.mjs. Run: `npm run test:browser:menu`.
import { mkdirSync } from "node:fs";
import { launch } from "../../scripts/browser/driver.mjs";

const SHOT_DIR = process.env.SHOT_DIR;
if (SHOT_DIR) mkdirSync(SHOT_DIR, { recursive: true });
const b = await launch();
await b.device(1280, 900, false);
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + detail}`); };
const main = () => b.text(".ws-content");
const openDialog = async label => { await b.clickText(label, "button"); await b.waitFor("dialog[open]"); };
const submitDialog = async label => { await b.clickText(label, "dialog[open] button[type=submit]"); await b.sleep(400); };
const radios = () => b.ev("return [...document.querySelectorAll('.choice b')].map(x=>x.textContent.trim()).join('|')");

try {
  // ---- New complaint (intake) --------------------------------------------------------------------------------
  await b.go("/woreda/intake");
  check("intake (Woreda): sources are In person, Phone, Letter", (await radios()) === "In person|Phone|Letter");
  check("intake (Woreda): an off-platform business stays with the Woreda", /stays with your Woreda/.test(await main()));
  await b.go("/bureau/intake");
  check("intake (City Bureau): the free call line is a source and there is no Phone", (await radios()) === "In person|Free call 8070|Letter");
  check("intake (City Bureau): an off-platform business goes to the Woreda where the consumer bought", /goes to the Woreda where the consumer bought/.test(await main()));

  await b.go("/subcity/intake");
  await b.clickText("Save the complaint", "button[type=submit]");
  check("intake: an empty form is blocked", await b.ev("return !!document.querySelector('#in-name')") && !/Complaint saved/.test(await main()));
  await b.click("input[name=source]");
  await b.type("#in-name", "Almaz Girma"); await b.type("#in-phone", "123");
  await b.set("#in-sub", "Kirkos"); await b.set("#in-wo", "4"); await b.type("#in-biz", "Kirkos Bakery");
  await b.set("#in-cat", "Expired products"); await b.type("#in-desc", "Bought bread that was past its date.");
  await b.clickText("Save the complaint", "button[type=submit]");
  check("intake: an invalid phone number is blocked", !/Complaint saved/.test(await main()));
  await b.type("#in-phone", "0911 234 567");
  await b.clickText("Save the complaint", "button[type=submit]");
  await b.waitFor("document.body.innerText.includes('Complaint saved')");
  const saved = await main();
  check("intake (Sub-City): saved with a reference", /recorded as CC-2026-00144/.test(saved));
  check("intake (Sub-City): off-platform business goes straight to the Woreda of the purchase", /straight to Woreda 4, Kirkos/.test(saved));
  await b.clickText("Record another", "button");
  check("intake: 'Record another' returns an empty form", (await b.ev("return document.querySelector('#in-name').value")) === "");
  await b.click("input[name=source]");
  await b.type("#in-name", "Almaz Girma"); await b.type("#in-phone", "0911 234 567"); await b.set("#in-sub", "Kirkos"); await b.set("#in-wo", "4");
  await b.type("#in-biz", "Gebriel Grain Traders"); await b.set("#in-cat", "Wrong weight or measure"); await b.type("#in-desc", "Short weight, four kilos missing.");
  await b.click(".form-card input[type=checkbox]:not([name=urgent])");
  await b.clickText("Save the complaint", "button[type=submit]");
  await b.waitFor("document.body.innerText.includes('Complaint saved')");
  check("intake: a business on AddisB2B gets the complaint first", /went to the business first/.test(await main()));

  // ---- Free call line ------------------------------------------------------------------------------------------------
  await b.go("/woreda/calls");
  check("calls (Woreda): 4 calls, 1 waiting", (await b.ev("return document.querySelectorAll('tbody tr').length")) === 4 && /Waiting/.test(await main()));
  await openDialog("Call back");
  await b.set("#cb-result", "Advice given"); await b.type("#cb-note", "Explained how to get a receipt.");
  await submitDialog("Save the call");
  const afterCall = await main();
  check("calls: recording the call back updates the row and the counts", /The call was saved/.test(afterCall) && /Called back: advice given/.test(afterCall) && !(await b.ev("return [...document.querySelectorAll('.status--warn')].some(x=>x.textContent.includes('Waiting'))")));
  await b.go("/subcity/calls");
  await openDialog("Call back");
  check("calls (Sub-City): can pass a call on to a Woreda", /Pass it to a Woreda/.test(await b.text("dialog[open]")));
  await b.go("/bureau/calls");
  check("calls (City Bureau): shows who took each call", /taken by/i.test(await main()) && /Abebech Mulugeta/.test(await main()) && (await b.ev("return document.querySelectorAll('tbody tr').length")) === 6);

  // ---- Tips ------------------------------------------------------------------------------------------------------------------
  await b.go("/woreda/tips");
  check("tips (Woreda): list, filter and anonymity", (await b.ev("return document.querySelectorAll('tbody tr').length")) === 3);
  await b.ev("[...document.querySelectorAll('.chips input')][2].click(); return 1"); await b.sleep(250);
  check("tips: 'Closed' filter", (await b.ev("return document.querySelectorAll('tbody tr').length")) === 1);
  await b.go("/woreda/tips/TIP-2026-00045");
  const tipPage = await b.text("body");
  check("PRIVACY: a tip shows no sender and never the private code", /Anonymous\. No name or phone was given/.test(tipPage) && !/Q7MD-42KX/.test(tipPage));
  check("tip (Woreda): can plan a visit, make a case or close", /Plan a visit/.test(tipPage) && /Make it a case/.test(tipPage) && /Close the tip/.test(tipPage) && !/Send to a Woreda/.test(tipPage));
  await openDialog("Plan a visit");
  await b.set("#pv-date", "2026-11-20"); await b.type("#pv-note", "Check the sugar price at the stalls.");
  await submitDialog("Plan the visit");
  check("tip (Woreda): a planned visit is recorded", /The visit is planned/.test(await main()) && /Follow-up planned/.test(await main()));
  await openDialog("Make it a case");
  await submitDialog("Make it a case");
  const made = await main();
  check("tip (Woreda): making it a case records a reference and ends the actions", /became case CC-2026-\d{5}/.test(made) && !(await b.ev("return !!document.querySelector('.actions-card')")));
  await b.go("/subcity/tips/TIP-2026-00045");
  check("tip (Sub-City): sends to a Woreda or makes a case here, no visit", /Send to a Woreda/.test(await main()) && /Make it a case here/.test(await main()) && !/Plan a visit/.test(await main()));
  await openDialog("Send to a Woreda");
  await b.set("#sw-woreda", "Woreda 5");
  await submitDialog("Send the tip");
  check("tip (Sub-City): it is now with that Woreda", /With Woreda 5/.test(await main()) && /Held by Woreda 5/.test(await main()));
  await b.go("/bureau/tips/TIP-2026-00045");
  check("tip (City Bureau): makes a case that goes to the Woreda where it happened", /Make it a case/.test(await main()) && /goes to the Woreda where it happened/.test(await main()) && !/Plan a visit|Send to a Woreda/.test(await main()));
  await openDialog("Close the tip");
  await submitDialog("Close the tip");
  check("tip: closing is recorded and ends the actions", /This tip is closed/.test(await main()));

  // ---- Messages ---------------------------------------------------------------------------------------------------------------------
  await b.go("/woreda/messages");
  check("messages (Woreda): 3 conversations, staff see the consumer by name", (await b.ev("return document.querySelectorAll('.chat-item').length")) === 3 && /Hirut Alemu/.test(await b.text(".chat-list")));
  await b.ev("[...document.querySelectorAll('.chat-item')][1].click(); return 1"); await b.sleep(250);
  check("messages (Woreda): the case moved up, so the consumer thread is read-only with a reason", /moved up to the Sub-City/.test(await b.text(".chat-pane")) && !(await b.ev("return !!document.querySelector('#chat-message')")));
  await b.go("/bureau/messages");
  await b.ev("[...document.querySelectorAll('.chat-item')][1].click(); return 1"); await b.sleep(250);
  await b.type("#chat-message", "Please come on Wednesday at 10:00.");
  await b.clickText("Send", ".chat-compose button[type=submit]");
  check("messages (City Bureau): holds the case, so it can write to the consumer", /Please come on Wednesday/.test(await b.text(".chat-feed")));
  check("messages: 'Open the case' stays inside the portal", (await b.ev("return [...document.querySelectorAll('.chat-pane a')].find(a=>a.textContent.includes('Open the case')).getAttribute('href')")) === "/bureau/cases/CC-2026-00123");

  // ---- Reports -------------------------------------------------------------------------------------------------------------------------
  for (const [level, heading] of [["woreda", "By market"], ["subcity", "Passed up by each Woreda"], ["bureau", "Who resolved them"]]) {
    await b.go(`/${level}/reports`);
    check(`reports (${level}): scoped to its own level (${heading})`, new RegExp(heading).test(await main()) && /Sample figures/.test(await main()) && (await b.ev("return document.querySelectorAll('.tile').length")) === 4);
  }
  await b.go("/bureau/reports");
  await b.ev("window.__blob=null; const o=URL.createObjectURL; URL.createObjectURL=x=>{window.__blob=x; return o(x)}; return 1");
  await b.clickText("Download as CSV", "button");
  const csv = await b.ev("return window.__blob ? await window.__blob.text() : ''");
  check("reports: the CSV download holds the figures", /Wrong weight or measure/.test(csv) && /"Received","412"/.test(csv) && /Outcome/.test(csv), csv.slice(0, 120));
  await b.go("/woreda/staff");
  check("administration pages are real pages now (see admin.mjs for their behaviour)", /Staff and roles/.test(await main()) && !/not built yet/.test(await main()));

  // ---- Phone ----------------------------------------------------------------------------------------------------------------------------------
  await b.device(360, 800, true);
  for (const url of ["/woreda/intake", "/woreda/calls", "/subcity/tips", "/woreda/tips/TIP-2026-00045", "/bureau/messages", "/bureau/reports"]) {
    await b.go(url);
    if (SHOT_DIR) await b.shot(`${SHOT_DIR}/${url.replace(/\W+/g, "-")}-360.png`);
    check(`phone: no sideways scroll on ${url}`, !(await b.ev("return document.documentElement.scrollWidth > document.documentElement.clientWidth")));
  }
  await b.device(1280, 900, false);
  for (const url of ["/woreda/intake", "/woreda/calls", "/subcity/tips/TIP-2026-00045", "/bureau/reports"]) { await b.go(url); if (SHOT_DIR) await b.shot(`${SHOT_DIR}/${url.replace(/\W+/g, "-")}-1280.png`); }

  check("no console errors or exceptions during the whole run", b.errors.length === 0, b.errors.slice(0, 6).join(" | "));
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
