// Collects the English text a person sees on the main screens, so translators know what to translate and so coverage can be measured.
// Needs the API and the site running. Run: `TEST_BASE_URL=http://localhost:3300 node scripts/i18n/collect.mjs`
// Writes .runtime/i18n-strings.json ({ "text": [screens...] }). With `--missing am` also lists what a dictionary does not cover yet.
import { mkdirSync, writeFileSync } from "node:fs";
import { launch } from "../browser/driver.mjs";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const b = await launch();
await b.device(1280, 900, false);
const LANG = process.env.LANG_CODE || "en"; // run once per language: LANG_CODE=am node scripts/i18n/collect.mjs
const found = new Map();
let screen = "";

// Visible text of the page and of any open dialog, plus placeholders, titles and aria labels.
const grab = () => b.ev(`
  const out = new Set();
  const norm = s => s.replace(/\\s+/g, " ").trim();
  const skip = el => !el || el.closest("script,style,textarea,code,[data-notranslate],.am,.tg-bubble,.ref,.receipt__ref") ;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const el = n.parentElement; if (skip(el)) continue;
    const t = norm(n.nodeValue || ""); if (t.length < 2 || t.length > 300) continue;
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    out.add(t);
  }
  for (const el of document.querySelectorAll("[placeholder],[title],[aria-label],[alt]")) {
    if (skip(el)) continue;
    for (const a of ["placeholder", "title", "aria-label", "alt"]) { const v = el.getAttribute(a); if (v && v.length > 1) out.add(norm(v)); }
  }
  return [...out];`);
const collect = async (name) => { screen = name; await b.waitFor("!document.documentElement.hasAttribute('data-translating')", 10000); await b.sleep(400); for (const t of await grab()) { if (!found.has(t)) found.set(t, new Set()); found.get(t).add(screen); } };
const visit = async (url, name = url, wait = 1200) => { await b.go(url); await b.sleep(wait); await collect(name); };

b.autoLogin = false;
await b.go("/help"); await b.ev(`document.cookie = "cr-lang=${LANG}; path=/"; return 1`);
for (const u of ["/", "/track", "/help", "/rights", "/how-to-complain", "/laws", "/news", "/news/check-before-you-buy", "/register", "/tip", "/sign-in", "/no-access"]) await visit(u);
await b.ev("document.querySelector('.hdr-item--group > button')?.focus(); return 1"); await b.sleep(200); await collect("menu open");
await b.go("/track?kind=tip"); await b.sleep(900); await collect("track tip");
b.autoLogin = true;

// Consumer: landing, case, messages, notifications, the complaint form step by step, the receipt
await visit("/my-cases");
const ref = await b.ev("return document.querySelector('a[href^=\"/cases/\"]')?.getAttribute('href')");
if (ref) await visit(ref, "case");
await visit("/messages"); await b.ev("document.querySelector('.tg-chat')?.click(); return 1"); await b.sleep(900); await collect("messages chat");
await visit("/notifications");
await b.go("/complaint/new"); await b.sleep(1200); await collect("wizard 1");
await b.click("#dd-category"); await b.sleep(200);
await b.set("#dd-category", "wrong_weight_measure"); await b.set("#c-subject", "Rice sold short"); await b.set("#c-what", "I bought a 25 kg sack of rice and it weighed 21 kg with stones.");
await b.click(".form-foot button[type=submit]"); await b.waitFor("document.querySelector('input[name=business]')"); await b.sleep(500); await collect("wizard 2");
await b.click("input[name=business]:last-of-type"); await b.ev("document.querySelectorAll('input[name=business]')[document.querySelectorAll('input[name=business]').length-1].click(); return 1"); await b.sleep(400); await collect("wizard 2 other");
await b.ev("document.querySelectorAll('input[name=business]')[0].click(); return 1");
await b.click(".form-foot button[type=submit]"); await b.waitFor("document.querySelector('#p-item')"); await b.sleep(400); await collect("wizard 3");
await b.set("#p-item", "Rice"); await b.set("#p-date", "2026-11-01"); await b.click("input[name=where][value=market]"); await b.pick("#p-sub", "Bole"); await b.pick("#p-wo", "Woreda 3"); await b.set("#p-paid", "100");
await b.click(".form-foot button[type=submit]"); await b.waitFor("document.querySelector('#ev-files')"); await b.sleep(400); await collect("wizard 4");
await b.ev(`const bin=Uint8Array.from(atob('${PNG}'),c=>c.charCodeAt(0));const dt=new DataTransfer();dt.items.add(new File([bin],'receipt.png',{type:'image/png'}));const el=document.querySelector('#ev-files');el.files=dt.files;el.dispatchEvent(new Event('change',{bubbles:true}));return 1`); await b.sleep(400); await collect("wizard 4 file");
await b.click(".form-foot button[type=submit]"); await b.waitFor("document.querySelector('#dd-want')"); await b.sleep(400); await collect("wizard 5");
await b.set("#dd-want", "refund"); await b.waitFor("document.querySelector('#o-amount')"); await b.set("#o-amount", "100"); await b.set("#o-phone", "0911234567"); await b.sleep(300); await collect("wizard 5 filled");
await b.click(".form-foot button[type=submit]"); await b.waitFor("document.querySelector('input[name=destination]')"); await b.sleep(500); await collect("wizard 6");
await b.click("input[name=destination][value=woreda]"); await b.sleep(400); await collect("wizard 6 woreda");
await b.click("input[type=checkbox][required]");
await b.click(".form-foot button[type=submit]"); await b.waitFor("location.pathname==='/complaint/sent'", 20000); await b.sleep(900); await collect("receipt");
await b.go("/tip"); await b.sleep(1000); await collect("tip form");
await b.pick("#t-sub", "Bole"); await b.set("#t-place", "Market 097"); await b.set("#t-when", "2026-11-04"); await b.set("#t-text", "Sugar sold at 160 ETB a kilo, the list says 125.");
b.autoLogin = false;
await b.click(".form-foot button[type=submit]"); await b.waitFor("location.pathname==='/tip/sent'", 15000); await b.sleep(800); await collect("tip receipt");
b.autoLogin = true;

// Business
for (const u of ["/business/overview", "/business/complaints", "/business/profile", "/business/notifications", "/business/messages", "/business/stock"]) await visit(u);
const bref = await b.ev("const a=document.querySelector('a[href^=\"/business/complaints/CC\"]'); return a?.getAttribute('href')");
await b.go("/business/complaints"); await b.sleep(800);
const brefs = await b.ev("return document.querySelector('a[href^=\"/business/complaints/CC\"]')?.getAttribute('href')");
if (brefs) await visit(brefs, "business case");

// Offices
for (const level of ["woreda", "subcity", "bureau"]) {
  for (const u of ["dashboard", "cases", "tips", "messages", "notifications"]) await visit(`/${level}/${u}`, `${level} ${u}`);
}
await b.go("/bureau/cases"); await b.sleep(900);
const cref = await b.ev("return document.querySelector('a[href^=\"/bureau/cases/CC\"]')?.getAttribute('href')");
if (cref) {
  await visit(cref, "office case");
  await b.click(".ws-title .btn-row button.btn--secondary"); await b.waitFor("document.querySelector('dialog[open] input[name=where]')"); await b.sleep(400); await collect("redirect dialog");
  await b.click("dialog[open] input[name=where][value=woreda]"); await b.sleep(300); await collect("redirect dialog woreda");
}

mkdirSync(".runtime", { recursive: true });
const obj = Object.fromEntries([...found].map(([t, s]) => [t, [...s]]));
writeFileSync(LANG === "en" ? ".runtime/i18n-strings.json" : `.runtime/i18n-strings-${LANG}.json`, JSON.stringify(obj, null, 1));
console.log(`${found.size} distinct strings from ${new Set([...found.values()].flatMap(s => [...s])).size} screens -> .runtime/i18n-strings${LANG === "en" ? "" : "-" + LANG}.json`);
await b.close();
process.exit(0);
