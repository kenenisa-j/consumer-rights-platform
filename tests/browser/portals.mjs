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
  check("workspace uses the AddisB2B look: light page, white sidebar, navy logo, amber edge on the current page", await b.ev("const r=getComputedStyle(document.querySelector('.rail')); const m=getComputedStyle(document.querySelector('.rail__logo')); const a=getComputedStyle(document.querySelector('.rail a[aria-current=page]')); return getComputedStyle(document.body).backgroundColor==='rgb(244, 247, 251)' && r.backgroundColor==='rgb(255, 255, 255)' && a.boxShadow.includes('rgb(245, 181, 27)') && !!document.querySelector('.ws-shell')"));
  check("the public header is not on a portal page", !(await b.ev("return !!document.querySelector('.site-header')")));
  await b.go("/");
  check("workspace styles do not leak into the public site", await b.ev("return !!document.querySelector('.site-header') && !document.body.classList.contains('ws')"));
  await b.go("/bureau/dashboard");
  check("bureau: shows where the open cases are", /Where the open cases are/.test(await main()) && (await b.ev("return document.querySelectorAll('.bar').length")) === 3);
  await b.go("/woreda/staff");
  check("administration pages open (no 404, no placeholder)", /Staff and roles/.test(await main()) && !/not built yet/.test(await main()));
  await b.go("/woreda/not-a-page");
  check("an unknown page inside a portal is a 404", /404|could not be found/i.test(await b.text("body")));
  await b.go("/nope/dashboard");
  check("an unknown portal is a 404", /404|could not be found/i.test(await b.text("body")));
  await b.go("/woreda/cases/CC-2026-99999");
  check("an unknown case is a 404", /404|could not be found/i.test(await b.text("body")));

  // Cases, tips, officer actions and messages now read the database: see data.mjs and chat.mjs. (Officer actions are the next build step.)

  // ---- Phone: the rail becomes a drawer ----------------------------------------------------------------------------------------
  await b.device(360, 800, true);
  await b.go("/woreda/dashboard");
  check("phone: the rail is hidden until the menu is opened", (await b.ev("return getComputedStyle(document.querySelector('.rail')).display")) === "none");
  await b.click(".nav-burger");
  check("phone: the menu button opens the rail", (await b.ev("return getComputedStyle(document.querySelector('.rail')).display")) === "flex");
  await b.clickText("Cases", ".rail nav a");
  await b.waitFor("location.pathname==='/woreda/cases'"); await b.sleep(500);
  check("phone: choosing a page closes the drawer", (await b.ev("return getComputedStyle(document.querySelector('.rail')).display")) === "none");
  for (const url of ["/woreda/dashboard", "/woreda/cases", "/subcity/cases", "/bureau/dashboard"]) {
    await b.go(url);
    if (SHOT_DIR) await b.shot(`${SHOT_DIR}/${url.replace(/\W+/g, "-")}-360.png`);
    check(`phone: no sideways scroll on ${url}`, !(await b.ev("return document.documentElement.scrollWidth > document.documentElement.clientWidth")));
  }
  await b.device(1280, 900, false);
  for (const url of ["/woreda/dashboard", "/woreda/cases", "/subcity/dashboard", "/bureau/cases"]) {
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
