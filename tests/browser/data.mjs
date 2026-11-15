// Data check: what is sent in the browser is stored in the database and shows up where it should.
// Needs the API (with the seeded database) and the site running. Run: `TEST_BASE_URL=http://localhost:3300 node tests/browser/data.mjs`.
import { launch } from "../../scripts/browser/driver.mjs";

const b = await launch();
await b.device(1280, 900, false);
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + detail}`); };
const stamp = Date.now().toString(36).toUpperCase();
const SUBJECT = `Test rice short ${stamp}`;
let reference = "";

try {
  // ---- The consumer's landing page reads the database ---------------------------------------------
  await b.go("/my-cases");
  let page = await b.text("main");
  check("my cases: shows the seeded complaints from the database", /Sugar sold above the posted price/.test(page) && /Electric kettle/.test(page), page.slice(0, 200));
  check("my cases: shows counts", /Complaints/.test(page) && /Being handled/.test(page));

  // ---- Make a complaint: the last step offers four places and defaults to the City Bureau ----------
  await b.go("/complaint/new");
  await b.set("#dd-category", "wrong_weight_measure");
  await b.set("#c-subject", SUBJECT);
  await b.set("#c-what", "I bought a 25 kg sack of white rice. At home it weighed 21 kg and had small stones in it.");
  await b.clickText("Next", "button[type=submit]");
  await b.waitFor("document.querySelector('input[name=business][type=radio]')");
  check("wizard: the business list comes from the database", (await b.ev("return document.querySelectorAll('input[name=business]').length")) >= 3);
  await b.click("input[name=business]");
  await b.clickText("Next", "button[type=submit]");
  await b.waitFor("document.querySelector('#p-item')");
  await b.set("#p-item", "White rice, one 25 kg sack");
  await b.set("#p-date", "2026-11-01");
  await b.click("input[name=where][value=market]");
  await b.set("#p-sub", "Akaki Kality");
  await b.waitFor("document.querySelectorAll('#p-wo option').length > 5");
  check("wizard: the Woreda list follows the Sub-City", (await b.ev("return document.querySelectorAll('#p-wo option').length")) === 14);
  await b.set("#p-wo", "7");
  await b.set("#p-paid", "2250");
  await b.clickText("Next", "button[type=submit]");
  await b.waitFor("document.querySelector('#ev-files')");
  await b.clickText("Next", "button[type=submit]");
  await b.waitFor("document.querySelector('#dd-want')");
  await b.set("#dd-want", "refund");
  await b.waitFor("document.querySelector('#o-amount')");
  await b.set("#o-amount", "2250");
  await b.clickText("Next", "button[type=submit]");
  await b.waitFor("document.querySelector('input[name=destination]')");
  const radios = await b.ev("return [...document.querySelectorAll('input[name=destination]')].map(r => ({ v: r.value, on: r.checked, off: r.disabled }))");
  check("destination: four choices", radios.length === 4, JSON.stringify(radios));
  check("destination: the City Bureau is the default", radios.find(r => r.on)?.v === "bureau", JSON.stringify(radios));
  check("destination: Woreda, Sub-City and the registered business are all available here", radios.every(r => !r.off), JSON.stringify(radios));
  await b.click("input[name=destination][value=bureau]");
  await b.click("input[type=checkbox][required]");
  await b.clickText("Send the complaint", "button[type=submit]");
  await b.waitFor("location.pathname==='/complaint/sent'", 15000);
  await b.sleep(600);
  const sent = await b.text("dialog[open]");
  reference = (sent.match(/CC-\d{4}-\d{5}/) ?? [""])[0];
  check("sent: a real reference from the database", /^CC-\d{4}-\d{5}$/.test(reference) && reference !== "CC-2026-00148", sent.slice(0, 200));
  check("sent: says it was received by the City Bureau", /Bureau/.test(sent), sent.slice(0, 300));

  await b.go("/my-cases");
  page = await b.text("main");
  check("my cases: the new complaint is listed", page.includes(reference) && page.includes(SUBJECT), page.slice(0, 200));
  await b.go(`/cases/${reference}`);
  page = await b.text("main");
  check("case page: shows what was stored", page.includes(SUBJECT) && /City Bureau|Bureau of Trade/.test(page) && /2,250 ETB/.test(page), page.slice(0, 300));

  // ---- Track without signing in --------------------------------------------------------------------
  await b.ev("document.cookie.split(';').forEach(c => document.cookie = c.split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/')");
  b.autoLogin = false;
  await b.go("/track");
  await b.set("#tr-ref", reference); await b.set("#tr-phone", "0412");
  await b.clickText("Check the status", "button[type=submit]");
  await b.waitFor("location.pathname==='/track/result'"); await b.sleep(900);
  page = await b.text("main");
  check("track: the right phone digits show the status", page.includes(reference) && /Received by the office/.test(page), page.slice(0, 300));
  await b.go("/track");
  await b.set("#tr-ref", reference); await b.set("#tr-phone", "9999");
  await b.clickText("Check the status", "button[type=submit]");
  await b.waitFor("location.pathname==='/track/result'"); await b.sleep(900);
  page = await b.text("main");
  check("track: wrong digits reveal nothing", /could not find a case/.test(page) && !page.includes(SUBJECT), page.slice(0, 200));
  b.autoLogin = true;

  // ---- The City Bureau sees it, a Woreda does not --------------------------------------------------
  await b.go("/bureau/cases");
  page = await b.text("main");
  check("bureau: the complaint is in the City Bureau's cases", page.includes(reference), page.slice(0, 300));
  await b.go("/bureau/dashboard");
  page = await b.text("main");
  check("bureau: it waits on the dashboard", page.includes(reference), page.slice(0, 300));
  await b.go(`/bureau/cases/${reference}`);
  page = await b.text("main");
  check("bureau: the officer sees the consumer's name and phone", /Hirut Alemu/.test(page) && /\+251900000412/.test(page), page.slice(0, 300));
  await b.go("/woreda/cases");
  page = await b.text("main");
  check("woreda: does not see a case held by the City Bureau", !page.includes(reference), page.slice(0, 200));
  check("woreda: sees the case sent to its office", /Electric kettle/.test(page), page.slice(0, 300));

  // ---- The business sees only a number -------------------------------------------------------------
  await b.go("/business/complaints");
  page = await b.text("main");
  check("business: sees the complaint about its business", /Rice sold short and mixed with stones/.test(page), page.slice(0, 300));
  check("business: sees the consumer only as a number", /Consumer \d{5}/.test(page) && !/Hirut/.test(page) && !/\+2519/.test(page), page.slice(0, 300));

  // ---- A tip is stored and reaches the office ------------------------------------------------------
  b.autoLogin = false;
  await b.go("/tip");
  await b.set("#t-sub", "Bole"); await b.set("#t-place", `Market 097 ${stamp}`); await b.set("#t-when", "2026-11-04");
  await b.set("#t-text", "Several shops sell sugar at 160 ETB a kilo. The list says 125.");
  await b.clickText("Send the tip", "button[type=submit]");
  await b.waitFor("location.pathname==='/tip/sent'", 15000); await b.sleep(600);
  const tipText = await b.text("dialog[open]");
  const tipRef = (tipText.match(/TIP-\d{4}-\d{5}/) ?? [""])[0];
  const code = (tipText.match(/\b[A-Z2-9]{4}-[A-Z2-9]{4}\b/) ?? [""])[0];
  check("tip: a real number and a private code", !!tipRef && !!code && tipRef !== "TIP-2026-00048", tipText.slice(0, 300));
  await b.go("/track?kind=tip");
  await b.set("#tr-tip", tipRef); await b.set("#tr-code", code);
  await b.clickText("Check the tip", "button[type=submit]");
  await b.waitFor("location.pathname==='/track/result'"); await b.sleep(900);
  page = await b.text("main");
  check("tip: the code shows its status", page.includes(tipRef) && /Received/.test(page), page.slice(0, 200));
  b.autoLogin = true;
  await b.go("/bureau/tips");
  page = await b.text("main");
  check("bureau: the tip is in the tips list, anonymous", page.includes(tipRef) && /Anonymous/.test(page), page.slice(0, 300));
  await b.go("/woreda/tips");
  page = await b.text("main");
  check("woreda: does not see a tip sent to another Sub-City", !page.includes(tipRef), page.slice(0, 200));

  // ---- Public content comes from the database ------------------------------------------------------
  b.autoLogin = false;
  await b.go("/news");
  page = await b.text("main");
  check("news: items from the database", /Check before you buy/.test(page) && /Always ask for a receipt/.test(page), page.slice(0, 200));
  await b.go("/news/check-before-you-buy");
  check("news: an article opens", /Three checks before you pay/.test(await b.text("main")));
  await b.go("/laws");
  check("laws: documents from the database", /Proclamation No. 813/.test(await b.text("main")));
  await b.go("/help");
  await b.waitFor("document.querySelector('main')?.innerText.includes('Who can make a complaint')", 8000);
  check("help: questions from the database", /Who can make a complaint/.test(await b.text("main")));
  await b.go("/");
  page = await b.text("main");
  check("home: news and questions from the database", /Check before you buy/.test(page) && /Does it cost anything/.test(page));
} catch (e) {
  check("run finished without an error", false, e.message);
} finally {
  const pageErrors = b.errors.filter(e => !/favicon|Failed to load resource/.test(e));
  check("no page errors", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
  await b.close();
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
