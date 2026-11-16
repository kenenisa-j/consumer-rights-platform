// How much of the interface is translated: compares the English crawl with a crawl in another language.
// Run: LANG_CODE=am node scripts/i18n/collect.mjs (after the English crawl), then: node scripts/i18n/coverage.mjs am
import { readFileSync } from "node:fs";

const lang = process.argv[2];
if (!lang) { console.log("Usage: node scripts/i18n/coverage.mjs <am|om|ti|so>"); process.exit(1); }
const en = JSON.parse(readFileSync(".runtime/i18n-strings.json", "utf8"));
const other = JSON.parse(readFileSync(`.runtime/i18n-strings-${lang}.json`, "utf8"));
// Interface text only: no names, numbers, dates, references or things people typed.
const skip = /^(CC|TIP)-|\d{4}|ETB|@|\+251|^\d+$|Hirut|Yonas|Abel|Gebriel|Kality|Test |Evidence test|Offices test|Market |Consumer 0|Woreda \d|^Rice|^Electric|^Sugar|MWI|Akaki|^[A-Z]{1,3}$|\d:\d\d|^[a-z .,]+$/;
// Place names stay in their official spelling, and news titles are content, not interface.
const names = /^(Addis Ketema|Akaki Kality|Arada|Bole|Gulele|Kirkos|Kolfe Keranio|Lemi Kura|Lideta|Nifas Silk-Lafto|Yeka)( Sub-City Trade Office, consumer protection desk)?$/;
const content = /Sunday Market|expiry dates|Complaints can now|returned to consumers|sugar and|receipt$|Bureau of Trade|Hemin|Grain|Gebriel/i;
const all = Object.keys(en).filter(t => !skip.test(t) && /[A-Za-z]{3}/.test(t) && !names.test(t) && !content.test(t));
const ui = all;
const still = ui.filter(t => t in other);
const done = ui.length - still.length;
console.log(`${lang}: ${done} of ${ui.length} interface phrases translated (${Math.round(100 * done / ui.length)}%)`);
const short = ui.filter(t => t.length <= 60), shortDone = short.filter(t => !(t in other)).length;
console.log(`${lang}: short interface text (up to 60 characters): ${shortDone} of ${short.length} translated (${Math.round(100 * shortDone / short.length)}%)`);
// Weighted by where people see it: every (phrase, screen) pair counts once.
let pairs = 0, left = 0; for (const t of ui) for (const sc of en[t]) { pairs++; if ((other[t] || []).includes(sc)) left++; }
console.log(`${lang}: by what people see (phrase on a screen): ${pairs - left} of ${pairs} translated (${Math.round(100 * (pairs - left) / pairs)}%)`);
const worst = still.map(t => [t, en[t].length]).sort((a, b) => b[1] - a[1]).slice(0, 25);
console.log("Most-used phrases still in English:"); for (const [t, n] of worst) console.log(`  ${n} screens  ${t.slice(0, 90)}`);
