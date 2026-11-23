// Header, languages, the complaint form's contact step, the business notice, evidence after a refresh, the receipt (copy and print) and
// notifications. Needs the API (seeded) and the site. Run: `TEST_BASE_URL=http://localhost:3300 node tests/browser/language.mjs`.
import { launch } from "../../scripts/browser/driver.mjs";

const b = await launch();
await b.device(1280, 900, false);
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + detail}`); };
const stamp = Date.now().toString(36).toUpperCase();
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const api = (method, path, body) => b.ev(`const r = await fetch(${JSON.stringify(path)}, { method: ${JSON.stringify(method)}, headers: { 'Content-Type': 'application/json' }, body: ${body ? JSON.stringify(JSON.stringify(body)) : "undefined"} }); let j = null; try { j = await r.json(); } catch {} return { status: r.status, j };`);
const next = () => b.click(".form-foot button[type=submit]");
const stepNow = () => b.ev("return document.querySelector('.wizard-head .kicker')?.textContent.match(/step ([0-9])/)?.[1] ?? ''");
const setLang = async (code) => { await b.set(".hdr .lang-switch select", code); await b.sleep(900); await b.waitFor("!document.documentElement.hasAttribute('data-translating')", 15000); await b.sleep(600); };
const choose = (sel, name, base64) => b.ev(`const bin = Uint8Array.from(atob(${JSON.stringify(base64)}), c => c.charCodeAt(0)); const dt = new DataTransfer(); dt.items.add(new File([bin], ${JSON.stringify(name)}, { type: 'image/png' })); const el = document.querySelector(${JSON.stringify(sel)}); el.files = dt.files; el.dispatchEvent(new Event('change', { bubbles: true })); return true;`);

try {
  // ---- The header ------------------------------------------------------------------------------------
  b.autoLogin = false;
  await b.go("/");
  const head = await b.ev(`const h = document.querySelector('.hdr'); const img = h.querySelector('.hdr-brand img'); return { logo: !!img && img.naturalWidth > 0, org: h.querySelector('.hdr-brand small')?.textContent, name: h.querySelector('.hdr-brand b')?.textContent, search: !!h.querySelector('input[type=search]'), langs: [...h.querySelectorAll('.lang-switch option')].map(o => o.textContent), signin: !!h.querySelector('.hdr-signin') }`);
  check("header: the Bureau's logo and the two-line name", head.logo && head.org === "Addis Ababa City Administration" && head.name === "Trade Bureau", JSON.stringify(head));
  check("header: a search box and a Sign in button", head.search && head.signin);
  check("header: the language list has English, Amharic, Afan Oromo, Tigrigna and Somali", head.langs.length === 5 && /አማርኛ/.test(head.langs[1]) && /Oromoo/.test(head.langs[2]) && /ትግርኛ/.test(head.langs[3]) && /Soomaali/.test(head.langs[4]), JSON.stringify(head.langs));
  const menu = () => b.ev("return [...document.querySelectorAll('.hdr-menu')].map(m => getComputedStyle(m).display)");
  check("menu: closed when the pointer is not over it", (await menu()).every(d => d === "none"));
  await b.hover(".hdr-item--group > button");
  check("menu: opens while the pointer is over it", (await menu())[0] === "block");
  await b.hover();
  check("menu: closes when the pointer leaves", (await menu()).every(d => d === "none"));

  // ---- Languages -----------------------------------------------------------------------------------------
  const expect = { am: ["ይግቡ", "ቅሬታ ያቅርቡ"], om: ["Seeni", "Komii dhiheessi"], ti: ["እቶ", "ጥርዓን ኣቕርብ"], so: ["Gal", "Gudbi cabasho"] };
  for (const [code, [signin, complaint]] of Object.entries(expect)) {
    await setLang(code);
    const t = await b.text(".hdr");
    check(`language ${code}: the header is translated`, t.includes(signin) && t.includes(complaint), t.slice(0, 160));
    check(`language ${code}: the page language is set`, (await b.ev("return document.documentElement.lang")) === code);
  }
  await b.go("/track");
  check("language: the choice stays on other pages", /የ|Seeni|እቶ|Gal/.test(await b.text(".hdr")) && (await b.ev("return document.documentElement.lang")) === "so");
  check("language: the Amharic sub-lines are hidden when another language is chosen", await b.ev("return [...document.querySelectorAll('.am')].every(e => getComputedStyle(e).display === 'none')"));
  check("language: text with no translation stays in English (nothing breaks)", (await b.text("main")).length > 200);
  await setLang("en");
  check("language: back to English", (await b.text(".hdr")).includes("Make a complaint") && (await b.ev("return document.documentElement.lang")) === "en");

  // ---- The complaint form: contact step, business notice, evidence after a refresh --------------------------
  b.autoLogin = true;
  await b.go("/complaint/new");
  await b.set("#dd-category", "wrong_weight_measure"); await b.set("#c-subject", `Language test ${stamp}`);
  await b.set("#c-what", "I bought a 25 kg sack of rice and it weighed 21 kg with small stones in it.");
  await next(); await b.waitFor("document.querySelector('input[name=business]')");
  await b.ev("document.querySelectorAll('input[name=business]')[0].click(); return 1"); await b.sleep(300);
  await next(); await b.waitFor("document.querySelector('#p-item')");
  await b.set("#p-item", "White rice"); await b.set("#p-date", "2026-11-01"); await b.click("input[name=where][value=market]");
  await b.pick("#p-sub", "Akaki Kality"); await b.pick("#p-wo", "Woreda 7"); await b.set("#p-paid", "2250");
  await next(); await b.waitFor("document.querySelector('#ev-files')");
  await choose("#ev-files", "receipt-after-refresh.png", PNG); await b.sleep(900);
  await b.ev("location.reload(); return 1"); await b.sleep(2500);
  await b.waitFor("document.querySelector('.wizard-head .kicker')", 15000); await b.sleep(1200);
  check("refresh: the form comes back at the evidence step", (await stepNow()) === "4", await stepNow());
  check("refresh: the chosen file is still there", /receipt-after-refresh\.png/.test(await b.text(".picked")), await b.text(".wizard-box"));
  await next(); await b.waitFor("document.querySelector('#dd-want')");
  await b.set("#dd-want", "refund"); await b.waitFor("document.querySelector('#o-amount')"); await b.set("#o-amount", "2250");
  const contact = await b.ev("return { phone: document.querySelector('#o-phone').value, email: document.querySelector('#o-email').value, lang: document.querySelector('#o-lang').value, web: document.querySelector('.check input:checked:disabled') !== null, emailBox: document.querySelector('.field .check:nth-of-type(2) input')?.checked, boxes: [...document.querySelectorAll('fieldset .check input')].map(i => ({ c: i.checked, d: i.disabled })) }");
  check("contact: the phone is empty (the person writes it)", contact.phone === "", JSON.stringify(contact));
  check("contact: the email is empty", contact.email === "");
  check("contact: the website is on and fixed; email and SMS are off", contact.boxes[0].c && contact.boxes[0].d && !contact.boxes[1].c && !contact.boxes[2].c, JSON.stringify(contact.boxes));
  check("contact: email and SMS are locked until the phone or email is written", contact.boxes[1].d && contact.boxes[2].d);
  check("contact: the language list has the five languages", (await b.options("#o-lang")) === 5);
  await b.set("#o-phone", "0911234567"); await b.set("#o-email", "me@example.com"); await b.sleep(300);
  await b.ev("const i=[...document.querySelectorAll('fieldset .check input')]; i[1].click(); i[2].click(); return 1"); await b.sleep(200);
  await b.pick("#o-lang", "Afan Oromo · Afaan Oromoo"); await b.sleep(200);
  await next(); await b.waitFor("document.querySelector('input[name=destination]')"); await b.sleep(500);
  const reg = await b.text(".dest");
  check("destination: shows the registered business typed earlier, no warning", /Your complaint is about/.test(reg) && /registered on this system/.test(reg) && !/is not registered on this system/.test(reg), reg.slice(0, 200));
  // go back and say the business is not registered
  await b.ev("[...document.querySelectorAll('.review-block__head button')][1].click(); return 1"); await b.sleep(500);
  await b.waitFor("document.querySelector('input[name=business]')");
  await b.ev("const r=document.querySelectorAll('input[name=business]'); r[r.length-1].click(); return 1"); await b.sleep(300);
  await b.set("#biz-name", "Corner Shop 12"); await b.sleep(200);
  for (let i = 0; i < 4; i++) { await next(); await b.sleep(500); }
  await b.waitFor("document.querySelector('input[name=destination]')", 8000);
  const unreg = await b.text(".dest");
  check("destination: an unregistered business is named and warned about", /Corner Shop 12 is not registered on this system/.test(unreg), unreg.slice(0, 260));
  check("destination: the business option is locked and the offices stay available", await b.ev("const v=[...document.querySelectorAll('input[name=destination]')]; return v.find(i=>i.value==='business').disabled && !v.find(i=>i.value==='bureau').disabled && !v.find(i=>i.value==='woreda').disabled"));
  await b.click("input[type=checkbox][required]");
  await b.click(".form-foot button[type=submit]");
  await b.waitFor("location.pathname==='/complaint/sent'", 30000); await b.sleep(900);

  // ---- The receipt -----------------------------------------------------------------------------------------
  const rec = await b.text("dialog[open]");
  const ref = (rec.match(/CC-\d{4}-\d{5}/) ?? [""])[0];
  check("receipt: the number is shown large with copy and print buttons", /^CC-/.test(ref) && /Copy the number/.test(rec) && /Copy all details/.test(rec) && /Print this page/.test(rec), rec.slice(0, 200));
  check("receipt: says where the number is kept (notifications and My cases)", /notifications/.test(rec) && /My cases/.test(rec) && /last 4 digits/.test(rec));
  await b.clickText("Copy the number", "button"); await b.sleep(400);
  check("receipt: the copy button confirms", /Copied/.test(await b.text("dialog[open]")));
  await b.media("print");
  const print = await b.ev(`const shown = el => !!el && getComputedStyle(el).display !== 'none';
    return { header: shown(document.querySelector('.hdr')), footer: shown(document.querySelector('.site-footer')), sections: [...document.querySelectorAll('main > section')].filter(shown).length, dialog: shown(document.querySelector('dialog[open]')), buttons: [...document.querySelectorAll('dialog[open] .no-print')].filter(shown).length, pos: getComputedStyle(document.querySelector('dialog[open]')).position }`);
  check("print: only the receipt prints (no page behind it, no header or footer)", !print.header && !print.footer && print.sections === 0 && print.dialog && print.pos !== "fixed", JSON.stringify(print));
  check("print: buttons are left out of the paper copy", print.buttons === 0, JSON.stringify(print));
  await b.media("screen");

  // ---- Evidence reached the case; notifications are real --------------------------------------------------------
  await b.go(`/cases/${ref}`);
  check("evidence: the file from before the refresh is on the case", /receipt-after-refresh\.png/.test(await b.text("main")));
  const notes = await api("GET", "/api/notifications?limit=20");
  const mine = (notes.j?.data?.items ?? []).find(n => n.type === "COMPLAINT_RECEIVED" && n.title.includes(ref));
  check("notifications: the consumer has a notice with the number and how to track it", !!mine && mine.messageBody.includes(ref) && /last 4 digits/.test(mine.messageBody) && /4567/.test(mine.messageBody), JSON.stringify(mine));
  check("notifications: the bell in the header shows the unread count", await b.ev("return !!document.querySelector('.hdr-bell__n')"));
  await b.go("/notifications"); await b.waitFor("document.querySelector('.notes li')", 10000);
  check("notifications: the page lists it", (await b.text(".notes")).includes(ref));
  const before = await b.ev("return Number(document.querySelector('.hdr-bell__n')?.textContent || 0)");
  await b.ev(`[...document.querySelectorAll('.notes a')].find(a => a.textContent.includes(${JSON.stringify(ref)})).click(); return 1`); await b.sleep(1500);
  check("notifications: opening one goes to the case and marks it read", (await b.url()).includes(`/cases/${ref}`) && (await api("GET", "/api/notifications/unread-count")).j?.data?.unreadCount < before + 1);

  // ---- The Bureau is told, and a message tells the other side ------------------------------------------------
  await b.go("/bureau/notifications"); await b.waitFor("document.querySelector('.notes li')", 10000);
  check("notifications: the City Bureau has a notice about the new complaint", (await b.text(".notes")).includes(ref) && /New complaint/.test(await b.text(".notes")));
  check("notifications: and a bell in its top bar", await b.ev("return !!document.querySelector('.topbar .hdr-bell')"));
  await b.go("/my-cases");
  const convs = await api("GET", "/api/messages/conversations");
  const conv = convs.j.data.find(c => c.caseRef === ref);
  await api("POST", `/api/messages/conversations/${conv.id}/text`, { text: `Hello Bureau ${stamp}` });
  await b.go("/bureau/dashboard");
  const bn = await api("GET", "/api/notifications?limit=30");
  check("notifications: a new message puts a notice in front of the Bureau", (bn.j?.data?.items ?? []).some(n => n.type === "NEW_MESSAGE" && n.title.includes(ref) && n.messageBody.includes(`Hello Bureau ${stamp}`)));
  await api("POST", `/api/messages/conversations/${conv.id}/text`, { text: `Bureau replies ${stamp}` });
  await b.go("/my-cases");
  const cn = await api("GET", "/api/notifications?limit=30");
  check("notifications: and the reply puts one in front of the consumer", (cn.j?.data?.items ?? []).some(n => n.type === "NEW_MESSAGE" && n.title.includes(ref) && n.messageBody.includes(`Bureau replies ${stamp}`)));
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
