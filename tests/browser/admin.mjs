// Government administration pages: staff, offices, categories, public content, settings (Woreda, Sub-City, City Bureau).
// Needs the site running; see public-site.mjs. Run: `npm run test:browser:admin`.
import { mkdirSync } from "node:fs";
import { launch } from "../../scripts/browser/driver.mjs";

const SHOT_DIR = process.env.SHOT_DIR;
if (SHOT_DIR) mkdirSync(SHOT_DIR, { recursive: true });
const b = await launch();
await b.device(1280, 900, false);
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + detail}`); };
const main = () => b.text(".ws-content");
const dlg = () => b.text("dialog[open]");
const rows = () => b.ev("return document.querySelectorAll('tbody tr').length");
const openDialog = async (label, tag = "button") => { await b.clickText(label, tag); await b.waitFor("dialog[open]"); };
const submit = async label => { await b.clickText(label, "dialog[open] button[type=submit]"); await b.sleep(400); };
const options = sel => b.ev(`return [...document.querySelectorAll(${JSON.stringify(sel)} + ' option')].map(o=>o.textContent.trim())`);

try {
  // ---- Every admin page opens at every level (no placeholder left) ----------------------------------------------
  for (const level of ["woreda", "subcity", "bureau"]) {
    for (const page of ["staff", "offices", "categories", "content", "settings"]) {
      await b.go(`/${level}/${page}`);
      const text = await main();
      if (/not built yet/.test(text) || !text.trim()) check(`${level}/${page} is built`, false, text.slice(0, 80));
    }
    check(`${level}: all five administration pages are built (no placeholder)`, true);
  }

  // ---- Staff ----------------------------------------------------------------------------------------------------------
  await b.go("/woreda/staff");
  check("staff (Woreda): 4 people, tiles show the counts", (await rows()) === 4 && /People/.test(await main()) && /On leave/.test(await main()));
  await openDialog("Add a person");
  check("staff (Woreda): can only give the Woreda roles and its own office", JSON.stringify(await options("#st-role")) === JSON.stringify(["Woreda officer", "Woreda desk officer", "Woreda officer and administrator"]) && (await options("#st-office")).length === 1);
  await submit("Save");
  check("staff: an empty form is blocked", /Add a person/.test(await dlg()) || (await b.ev("return !!document.querySelector('dialog[open]')")));
  await b.type("#st-name", "Dawit Kebede 2"); await b.type("#st-email", "dawit.kebede@example.com");
  await submit("Save");
  check("staff: a duplicate email is refused inside the dialog", /already has that email/.test(await dlg()));
  await b.type("#st-email", "yohannes.tadesse@example.com"); await b.type("#st-name", "Yohannes Tadesse");
  await submit("Save");
  check("staff: a new person is added and confirmed", (await rows()) === 5 && /The person was added/.test(await main()) && /Yohannes Tadesse/.test(await main()));
  await openDialog("Edit Meron Tadesse");
  await b.set("#st-role", "Woreda officer");
  await submit("Save");
  check("staff: the last administrator cannot be demoted", /at least one active administrator/.test(await dlg()));
  await b.click("dialog[open] .modal__close");
  await openDialog("Edit Dawit Kebede");
  await b.set("#st-status", "On leave");
  await submit("Save");
  check("staff: changing a status is saved and counted", /The changes were saved/.test(await main()) && /On leave/.test(await main()));
  await b.go("/subcity/staff");
  await openDialog("Add a person");
  check("staff (Sub-City): offers the Woreda leads and its own offices", (await options("#st-role")).includes("Woreda officer and administrator") && (await options("#st-office")).includes("Woreda 11"));
  await b.go("/bureau/staff");
  await openDialog("Add a person");
  check("staff (City Bureau): can give every government role, incl. content administrator", (await options("#st-role")).includes("Content administrator") && (await options("#st-office")).length === 13);

  // ---- Offices ---------------------------------------------------------------------------------------------------------
  await b.go("/woreda/offices");
  check("offices (Woreda): its place on the path and its markets", /You are here/.test(await main()) && /Market 097/.test(await main()));
  await openDialog("Edit office details");
  await b.type("#of-phone", "abc");
  await submit("Save");
  check("offices: an invalid phone number is blocked (the pattern works)", await b.ev("return !!document.querySelector('dialog[open]')"));
  await b.type("#of-phone", "0116 000 777"); await b.type("#of-room", "Room 5");
  await submit("Save");
  check("offices: valid details are saved and shown", /Office details saved/.test(await main()) && /0116 000 777/.test(await main()) && /Room 5/.test(await main()));
  await b.go("/subcity/offices");
  check("offices (Sub-City): lists its 5 Woredas with their lead officers", (await rows()) === 5 && /Samuel Haile/.test(await main()));
  await b.go("/bureau/offices");
  check("offices (City Bureau): the 11 Sub-Cities, nothing to edit", (await rows()) === 11 && !(await b.ev("return [...document.querySelectorAll('button')].some(x=>x.textContent.includes('Edit office details'))")));

  // ---- Categories --------------------------------------------------------------------------------------------------------
  await b.go("/woreda/categories");
  check("categories (Woreda): read-only, 'the same in every office'", /The same in every office/.test(await main()) && !(await b.ev("return [...document.querySelectorAll('button')].some(x=>/^(Add|Rename|Remove)/.test(x.textContent.trim()))")));
  await openDialog("Suggest a change");
  await b.type("#cat-suggest", "Please add a category for counterfeit goods.");
  await submit("Send to the City Bureau");
  check("categories (Woreda): a suggestion goes to the Bureau", /suggestion was sent to the City Bureau/.test(await main()));
  await b.go("/bureau/categories");
  check("categories (City Bureau): three editable lists", (await b.ev("return document.querySelectorAll('.card h2').length")) >= 3 && /Rename/.test(await main()));
  const before = await b.ev("return document.querySelectorAll('.link-list li').length");
  await openDialog("Add to Complaint categories");
  await b.type("#cat-name", "expired products");
  await submit("Save");
  check("categories: a duplicate is refused (any capitals)", /already in the list/.test(await dlg()));
  await b.type("#cat-name", "Counterfeit goods");
  await submit("Save");
  check("categories: a new item is added", (await b.ev("return document.querySelectorAll('.link-list li').length")) === before + 1 && /Counterfeit goods/.test(await main()));
  await openDialog("Rename Counterfeit goods");
  await b.type("#cat-name", "Fake brands");
  await submit("Save");
  check("categories: an item can be renamed", /Fake brands/.test(await main()) && !/Counterfeit goods/.test(await main()));
  await openDialog("Remove Fake brands");
  await submit("Remove");
  check("categories: removing hides it from new forms", !/Fake brands/.test(await main()) && /Complaints already using it keep it/.test(await main()));
  await openDialog("Remove Other");
  await submit("Remove");
  check("categories: the catch-all 'Other' cannot be removed", /catch-all item stays/.test(await dlg()));
  await b.click("dialog[open] .modal__close");

  // ---- Public content -------------------------------------------------------------------------------------------------------
  await b.go("/woreda/content");
  check("content (Woreda): local notice types only", await (async () => { await openDialog("New notice"); const t = await options("#ct-type"); await b.click("dialog[open] .modal__close"); return JSON.stringify(t) === JSON.stringify(["Local notice", "Event", "Office closure"]); })());
  await openDialog("New notice");
  await b.type("#ct-title", "Market day: bring your receipts"); await b.type("#ct-body", "Officers will be at the gate.");
  await submit("Send to the Sub-City for approval");
  check("content (Woreda): a new notice waits for the Sub-City and cannot be published", /sent to the Sub-City for approval/.test(await main()) && (await b.ev("return [...document.querySelectorAll('tbody tr')][0].textContent.includes('Waiting for the Sub-City')")));
  await b.go("/subcity/content");
  check("content (Sub-City): shows the Woreda's notice waiting for approval", /Waiting for your approval/.test(await main()) && /From Woreda 7, Meron Tadesse/.test(await main()));
  await b.clickText("Send back", "button");
  await b.waitFor("dialog[open]");
  await b.type("#sb-reason", "no");
  await submit("Send back");
  check("content (Sub-City): sending back needs a real reason", /Send back/.test(await dlg()) && await b.ev("return !!document.querySelector('dialog[open]')"));
  await b.type("#sb-reason", "Add the time and the place of the check.");
  await submit("Send back");
  check("content (Sub-City): sent back to the Woreda as a draft with the note", /Sent back to the Woreda/.test(await main()) && /Sent back: Add the time/.test(await main()));
  await b.go("/subcity/content");
  await b.clickText("Approve and publish", "button");
  check("content (Sub-City): approving publishes the notice", /Approved/.test(await main()) && !/Waiting for your approval/.test(await main()));
  await b.go("/bureau/content");
  await openDialog("New item");
  check("content (City Bureau): city-wide types and a status", JSON.stringify(await options("#ct-type")) === JSON.stringify(["Rights article", "Law", "Guide", "News"]) && (await options("#ct-status")).includes("Archived"));
  await b.type("#ct-title", "How to read a price list"); await b.set("#ct-type", "Guide"); await b.set("#ct-status", "Published");
  await submit("Save");
  check("content (City Bureau): a published guide appears first", /Saved/.test(await main()) && /How to read a price list/.test(await b.ev("return document.querySelectorAll('tbody tr')[0].textContent")));

  // ---- Settings -------------------------------------------------------------------------------------------------------------------
  await b.go("/woreda/settings");
  check("settings (Woreda): assignment, urgent officer, email alerts, and what the Bureau set", /fewest open cases/.test(await main()) && /Set by the City Bureau/.test(await main()) && !/Tips with no clear Woreda/.test(await main()));
  await b.clickText("Save settings", "button[type=submit]");
  check("settings (Woreda): saving confirms", /Settings saved/.test(await main()));
  await b.go("/subcity/settings");
  check("settings (Sub-City): also chooses where unclear tips go", /Tips with no clear Woreda go to/.test(await main()));
  await b.go("/bureau/settings");
  await b.type("#cs-number", "ab");
  await b.clickText("Save settings", "button[type=submit]");
  check("settings (City Bureau): the free call number must be digits", !/Settings saved/.test(await main()));
  await b.type("#cs-number", "8071"); await b.type("#cs-reply", "24");
  await b.clickText("Save settings", "button[type=submit]");
  check("settings (City Bureau): valid settings are saved and time limits are marked proposed", /Settings saved/.test(await main()) && /Proposed/.test(await main()));

  // ---- Phone ----------------------------------------------------------------------------------------------------------------------------
  await b.device(360, 800, true);
  for (const url of ["/woreda/staff", "/subcity/offices", "/bureau/categories", "/subcity/content", "/bureau/settings"]) {
    await b.go(url);
    if (SHOT_DIR) await b.shot(`${SHOT_DIR}/${url.replace(/\W+/g, "-")}-360.png`);
    check(`phone: no sideways scroll on ${url}`, !(await b.ev("return document.documentElement.scrollWidth > document.documentElement.clientWidth")));
  }
  await b.device(1280, 900, false);
  for (const url of ["/woreda/staff", "/subcity/content", "/bureau/categories"]) { await b.go(url); if (SHOT_DIR) await b.shot(`${SHOT_DIR}/${url.replace(/\W+/g, "-")}-1280.png`); }

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
