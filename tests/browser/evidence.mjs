// Evidence and destination check: files chosen in the complaint form are stored and shown where they should be, and the destination
// step offers every Sub-City, then only the Woredas of the chosen Sub-City. Needs the API (seeded) and the site.
// Run: `TEST_BASE_URL=http://localhost:3300 node tests/browser/evidence.mjs`.
import { launch } from "../../scripts/browser/driver.mjs";

const b = await launch();
await b.device(1280, 900, false);
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + detail}`); };
const stamp = Date.now().toString(36).toUpperCase();
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

// Gives a file input a real file, the way choosing one in the browser would.
const choose = (sel, name, mime, base64, padKb = 0) => b.ev(`const bin = Uint8Array.from(atob(${JSON.stringify(base64)}), c => c.charCodeAt(0));
  const pad = new Uint8Array(${padKb} * 1024); const f = new File([bin, pad], ${JSON.stringify(name)}, { type: ${JSON.stringify(mime)} });
  const dt = new DataTransfer(); dt.items.add(f); const el = document.querySelector(${JSON.stringify(sel)}); el.files = dt.files;
  el.dispatchEvent(new Event('change', { bubbles: true })); return true;`);
const optionCount = sel => b.options(sel);

try {
  await b.go("/complaint/new");
  await b.set("#dd-category", "wrong_weight_measure");
  await b.set("#c-subject", `Evidence test ${stamp}`);
  await b.set("#c-what", "I bought a 25 kg sack of white rice. At home it weighed 21 kg and had small stones in it.");
  await b.clickText("Next", "button[type=submit]");
  await b.waitFor("document.querySelector('input[name=business][type=radio]')");
  await b.click("input[name=business]");
  await b.clickText("Next", "button[type=submit]");
  await b.waitFor("document.querySelector('#p-item')");
  await b.set("#p-item", "White rice"); await b.set("#p-date", "2026-11-01"); await b.click("input[name=where][value=market]");
  await b.pick("#p-sub", "Akaki Kality"); await b.pick("#p-wo", "Woreda 7"); await b.set("#p-paid", "2250");
  await b.clickText("Next", "button[type=submit]");
  await b.waitFor("document.querySelector('#ev-files')");

  // ---- Evidence step ------------------------------------------------------------------------------
  check("evidence: one calm drop area, the browser's raw file control is hidden", await b.ev("const i = document.querySelector('#ev-files'); const z = document.querySelector('.dropzone'); return !!z && i.classList.contains('visually-hidden') && z.getBoundingClientRect().height < 200"));
  await choose("#ev-files", "receipt.png", "image/png", PNG);
  await choose("#ev-files", "photo-of-sack.png", "image/png", PNG);
  await b.sleep(300);
  check("evidence: chosen files appear as a tidy list with their size", (await b.ev("return document.querySelectorAll('.picked__row').length")) === 2 && /receipt\.png/.test(await b.text(".picked")));
  await choose("#ev-files", "notes.txt", "text/plain", btoa("hello"));
  await b.sleep(200);
  check("evidence: a wrong type is refused with a clear message", /not a JPG, PNG or PDF/.test(await b.text(".wizard-box")), await b.text(".wizard-box"));
  await choose("#ev-files", "huge.png", "image/png", PNG, 11 * 1024);
  await b.sleep(200);
  check("evidence: a file over 10 MB is refused", /larger than 10 MB/.test(await b.text(".wizard-box")));
  await b.ev("document.querySelectorAll('.picked__main input[type=checkbox]')[0].click(); return 1"); // the first file may be shown to the business
  await b.clickText("Next", "button[type=submit]");
  await b.waitFor("document.querySelector('#dd-want')");
  await b.set("#dd-want", "refund"); await b.waitFor("document.querySelector('#o-amount')"); await b.set("#o-amount", "2250");
  await b.clickText("Next", "button[type=submit]");
  await b.waitFor("document.querySelector('input[name=destination]')");

  // ---- Destination: every Sub-City, then only its Woredas ------------------------------------------
  await b.click("input[name=destination][value=subcity]");
  await b.waitFor("document.querySelector('#dest-sub')");
  check("destination (Sub-City): a dropdown with all 11 Sub-Cities", (await optionCount("#dest-sub")) === 11);
  await b.click("input[name=destination][value=woreda]");
  await b.waitFor("document.querySelector('#dest-wo')");
  check("destination (Woreda): asks for the Sub-City first, Woreda is locked until then", await b.ev("return document.querySelector('#dest-wo').disabled === true") || (await optionCount("#dest-wo")) > 0);
  // typing narrows the suggestions to real offices
  await b.ev("const el=document.querySelector('#dest-sub'); el.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'ko'); el.dispatchEvent(new Event('input',{bubbles:true})); return 1"); await b.sleep(300);
  const typed = await b.ev("return [...document.querySelectorAll('[role=option]')].map(o => o.textContent.trim())");
  check("typing: 'ko' suggests Kolfe Keranio and nothing unrelated", typed.includes("Kolfe Keranio") && !typed.includes("Bole") && !typed.includes("Arada"), JSON.stringify(typed));
  await b.ev("const el=document.querySelector('#dest-sub'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'zzz'); el.dispatchEvent(new Event('input',{bubbles:true})); return 1"); await b.sleep(250);
  check("typing: a name that matches nothing says so", /Nothing matches/.test(await b.text(".combo__list")), await b.text(".dest"));
  await b.pick("#dest-sub", "Bole"); await b.sleep(300);
  check("destination (Woreda): after Bole, only Bole's 14 Woredas", (await optionCount("#dest-wo")) === 14, String(await optionCount("#dest-wo")));
  await b.pick("#dest-sub", "Gulele"); await b.sleep(300);
  check("destination (Woreda): changing the Sub-City changes the Woredas (Gulele has 10)", (await optionCount("#dest-wo")) === 10 && (await b.ev("return document.querySelector('#dest-wo').value")) === "");
  await b.pick("#dest-sub", "Bole"); await b.sleep(200);
  await b.pick("#dest-wo", "Woreda 3");
  await b.click("input[type=checkbox][required]");
  await b.clickText("Send the complaint", "button[type=submit]");
  await b.waitFor("location.pathname==='/complaint/sent'", 30000); await b.sleep(700);
  const sent = await b.text("dialog[open]");
  const reference = (sent.match(/CC-\d{4}-\d{5}/) ?? [""])[0];
  check("sent: the complaint went to Bole Woreda 3", /Bole Woreda 3 Trade Office/.test(sent), sent.slice(0, 200));
  check("sent: both files uploaded (no warning)", !/were not uploaded/.test(sent), sent.slice(0, 300));

  // ---- Stored and served ---------------------------------------------------------------------------
  await b.go(`/cases/${reference}`);
  const page = await b.text("main");
  check("case page: lists the two files", /receipt\.png/.test(page) && /photo-of-sack\.png/.test(page), page.slice(0, 300));
  const served = await b.ev(`const links = [...document.querySelectorAll('a[href^="/api/evidence/"]')]; const r = await fetch(links[0].getAttribute('href')); return r.status + ' ' + r.headers.get('content-type')`);
  check("case page: a file opens from its link", /^200 image\/png/.test(served), served);
  check("case page: files can be added later", await b.ev("return !!document.querySelector('#more-files')"));
  await choose("#more-files", "late-receipt.png", "image/png", PNG);
  await b.sleep(300); await b.clickText("Upload", "button"); await b.waitFor("/late-receipt/.test(document.body.innerText) && !document.querySelector('.picked__row.is-uploading')", 15000); await b.sleep(1200);
  await b.go(`/cases/${reference}`);
  check("case page: the later file is stored too", /late-receipt\.png/.test(await b.text("main")));
  const bad = await b.ev(`const r = await fetch('/api/complaints/${reference}/evidence?name=x.png', { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: new Blob(['not an image at all']) }); return r.status`);
  check("API: a text file renamed .png is refused", bad === 400, String(bad));

  // ---- Who can open them --------------------------------------------------------------------------
  await b.go(`/bureau/cases/${reference}`);
  const bureau = await b.text("main");
  check("bureau: sees all the files", /receipt\.png/.test(bureau) && /photo-of-sack\.png/.test(bureau) && /Officers only/.test(bureau), bureau.slice(0, 300));
  const fileId = await b.ev(`return [...document.querySelectorAll('a[href^="/api/evidence/"]')].find(a => /photo-of-sack/.test(a.textContent)).getAttribute('href')`);
  await b.go("/business/overview");
  const blocked = await b.ev(`const r = await fetch(${JSON.stringify(fileId)}); return r.status`);
  check("business: cannot open a file it was not allowed to see", blocked === 403, String(blocked));
  await b.go(`/business/complaints/${reference}`);
  const biz = await b.text("main");
  check("business: sees only the file shared with it", /receipt\.png/.test(biz) && !/photo-of-sack\.png/.test(biz) && !/late-receipt/.test(biz), biz.slice(0, 400));

  // ---- Tip form: Woreda follows the Sub-City --------------------------------------------------------
  b.autoLogin = false;
  await b.go("/tip");
  check("tip: Woreda is locked until a Sub-City is chosen", await b.ev("return document.querySelector('#t-wo').disabled"));
  await b.pick("#t-sub", "Bole"); await b.sleep(300);
  check("tip: after Bole, only its 14 Woredas", (await optionCount("#t-wo")) === 14, String(await optionCount("#t-wo")));
  check("tip: no file upload is offered (tips store no files)", !(await b.ev("return !!document.querySelector('#t-files')")));
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
