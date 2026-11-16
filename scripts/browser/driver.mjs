// Small browser driver over the Chrome DevTools Protocol. No dependencies: it uses Node's built-in WebSocket and
// whatever Chromium-based browser is installed (Edge, Chrome or Chromium). Used by tests/browser/*.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DEV_TEST_ACCOUNTS, DEV_TEST_PASSWORD } from "@consumer-rights/contracts";

export const BASE = process.env.TEST_BASE_URL || "http://localhost:3300";

const CANDIDATES = [
  process.env.BROWSER_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
].filter(Boolean);

export function findBrowser() {
  const found = CANDIDATES.find(p => existsSync(p));
  if (!found) throw new Error("No Chromium-based browser found. Install Edge or Chrome, or set BROWSER_PATH.");
  return found;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function launch() {
  const port = 9300 + Math.floor(Math.random() * 600);
  const profile = mkdtempSync(path.join(tmpdir(), "cr-browser-"));
  const proc = spawn(findBrowser(), ["--headless=new", "--disable-gpu", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    "--no-first-run", "about:blank"], { stdio: "ignore" });

  // However the run ends (a crash, a timeout, process.exit), stop this browser and delete its profile folder.
  // Profiles are large; leaked ones once filled a disk.
  const cleanup = () => {
    if (process.platform === "win32") spawnSync("taskkill", ["/T", "/F", "/PID", String(proc.pid)], { stdio: "ignore" }); else proc.kill();
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* still in use */ }
  };
  process.once("exit", cleanup);
  for (const sig of ["SIGINT", "SIGTERM"]) process.once(sig, () => { cleanup(); process.exit(1); });

  let target;
  for (let i = 0; i < 60 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === "page"); } catch { /* starting */ }
    if (!target) await sleep(250);
  }
  if (!target) { proc.kill(); throw new Error("The browser did not start."); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener("open", r, { once: true }));
  let nextId = 0;
  const pending = new Map();
  const errors = [];
  ws.addEventListener("message", event => {
    const m = JSON.parse(event.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); return; }
    if (m.method === "Runtime.exceptionThrown") {
      const text = String(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
      // Chrome aborts a cross-page view transition when a second navigation starts first: harmless, and only seen when tests navigate fast.
      if (!/Transition was aborted because of invalid state/.test(text)) errors.push(`exception: ${text}`);
    }
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(`console.error: ${m.params.args.map(a => a.value ?? a.description).join(" ")}`);
    // The API rate-limits sign-ins; the driver waits and retries, so those answers are not page errors.
    if (m.method === "Log.entryAdded" && m.params.entry.level === "error" && !String(m.params.entry.url ?? "").includes("/api/auth/sign-in")) errors.push(`log: ${m.params.entry.text} ${m.params.entry.url ?? ""}`);
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const id = ++nextId; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
  await send("Page.enable"); await send("Runtime.enable"); await send("Log.enable");

  const b = {
    errors, sleep,
    /** Device emulation: width, height, and whether to behave like a phone. */
    device: (width, height, mobile = false) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile }),
    async ev(expr) {
      const r = await send("Runtime.evaluate", { expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    },
    async waitFor(cond, ms = 6000) {
      const end = Date.now() + ms;
      while (Date.now() < end) { try { if (await b.ev(`return !!(${cond})`)) return true; } catch { /* navigating */ } await sleep(150); }
      return false;
    },
    /** The test account that can open `url`, or null for a public page. */
    accountFor(url) {
      const p = url.replace(/^https?:\/\/[^/]+/, "");
      if (/^\/(woreda)(\/|$)/.test(p)) return "woreda_admin";
      if (/^\/subcity(\/|$)/.test(p)) return "subcity_coordinator";
      if (/^\/bureau(\/|$)/.test(p)) return "bureau_admin";
      if (/^\/business(\/|$)/.test(p)) return "business";
      if (/^\/(my-cases|cases|notifications|messages|complaint\/new|verify)(\/|\?|$)/.test(p)) return "consumer";
      return null;
    },
    portal: null,
    autoLogin: true,
    sessions: new Map(),
    /**
     * Becomes a seeded test account. The first time, signs in through the API (same-origin, so the cookie is the real one)
     * and keeps the session cookie; later switches put that cookie back instead of signing in again, because the API
     * limits sign-ins to a few every 10 seconds. Waits out the limit when it is hit.
     */
    async login(key) {
      const a = DEV_TEST_ACCOUNTS.find(x => x.key === key);
      if (!a) throw new Error(`No test account ${key}`);
      await send("Network.enable");
      const saved = b.sessions.get(key);
      if (saved) {
        await send("Network.deleteCookies", { name: saved.name, url: BASE });
        await send("Network.setCookie", { ...saved, url: BASE });
        b.portal = a.portal; return;
      }
      await send("Page.navigate", { url: BASE + "/help" });
      await sleep(700); await b.waitFor("document.readyState==='complete'");
      const phone = a.portal === "consumer";
      for (let attempt = 0; attempt < 4; attempt++) {
        const status = await b.ev(`const r=await fetch(${JSON.stringify(phone ? "/api/auth/sign-in/phone-number" : "/api/auth/sign-in/email")},{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(${JSON.stringify(phone ? { phoneNumber: a.phone, password: DEV_TEST_PASSWORD } : { email: a.email, password: DEV_TEST_PASSWORD })})}); return r.status;`);
        if (status === 200) {
          const { cookies } = await send("Network.getCookies", { urls: [BASE] });
          const c = cookies.find(x => x.name.endsWith("session_token"));
          if (c) b.sessions.set(key, { name: c.name, value: c.value, path: c.path, httpOnly: c.httpOnly, secure: c.secure, sameSite: c.sameSite, expires: c.expires });
          b.portal = a.portal; return;
        }
        if (status === 429) { await sleep(11000); continue; }
        throw new Error(`Test sign-in as ${key} failed with ${status}`);
      }
      throw new Error(`Test sign-in as ${key} kept hitting the rate limit`);
    },
    async go(url) {
      const need = b.autoLogin ? b.accountFor(url) : null;
      if (need && DEV_TEST_ACCOUNTS.find(x => x.key === need).portal !== b.portal) await b.login(need);
      await send("Page.navigate", { url: url.startsWith("http") ? url : BASE + url });
      await sleep(700); await b.waitFor("document.readyState==='complete'"); await sleep(400);
    },
    /** Sets a field the way a person would, so React controlled inputs see it. */
    async set(sel, value) {
      const ok = await b.ev(`const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return false;
        const proto=el instanceof HTMLSelectElement?HTMLSelectElement.prototype:el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto,'value').set.call(el,${JSON.stringify(value)});
        el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return true;`);
      if (!ok) throw new Error(`No element ${sel}`);
    },
    /** Types like a person (marks the field as user-edited, so `minlength` is enforced like in real use). */
    async type(sel, text) {
      if (!await b.ev(`const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return false; el.focus(); el.select?.(); return true;`)) throw new Error(`No element ${sel}`);
      await send("Input.insertText", { text }); await sleep(120);
    },
    /** Types into a typeahead dropdown (ComboField) and clicks the suggestion with exactly that text. */
    async pick(sel, label) {
      const ok = await b.ev(`const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return false; el.focus();
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(label)});
        el.dispatchEvent(new Event('input',{bubbles:true})); return true;`);
      if (!ok) throw new Error(`No field ${sel}`);
      await sleep(250);
      const hit = await b.ev(`const li=[...document.querySelectorAll('[role=option]')].find(o=>o.textContent.trim().toLowerCase()===${JSON.stringify(label.toLowerCase())});
        if(!li) return false; li.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true})); return true;`);
      if (!hit) throw new Error(`No suggestion "${label}" for ${sel}`);
      await sleep(250);
    },
    /** How many suggestions a typeahead dropdown offers (opens it to count them). */
    async options(sel) {
      await b.ev(`const el=document.querySelector(${JSON.stringify(sel)}); el.focus(); el.click(); return true;`); await sleep(250);
      const n = await b.ev(`const el=document.querySelector(${JSON.stringify(sel)}); const l=document.getElementById(el.getAttribute('aria-controls')); return l ? l.querySelectorAll('[role=option]').length : 0;`);
      await b.ev("document.activeElement && document.activeElement.blur(); return 1"); await sleep(150);
      return n;
    },
    /** Moves the real mouse pointer over an element (for hover menus), or away from everything when no selector is given. */
    async hover(sel) {
      const at = sel ? await b.ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; const r=e.getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2]`) : [4, 690];
      if (!at) throw new Error(`No element ${sel}`);
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: at[0], y: at[1] });
      await sleep(300);
    },
    async click(sel) {
      if (!await b.ev(`const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return false; el.click(); return true;`)) throw new Error(`No element ${sel}`);
      await sleep(350);
    },
    async clickText(text, tag = "button,a") {
      if (!await b.ev(`const el=[...document.querySelectorAll(${JSON.stringify(tag)})].find(e=>e.textContent.trim().startsWith(${JSON.stringify(text)})); if(!el) return false; el.click(); return true;`)) {
        throw new Error(`No ${tag} starting with "${text}"`);
      }
      await sleep(450);
    },
    text: sel => b.ev(`return document.querySelector(${JSON.stringify(sel)})?.innerText ?? ''`),
    url: () => b.ev("return location.pathname+location.search"),
    async shot(file) { writeFileSync(file, Buffer.from((await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true })).data, "base64")); },
    async close() {
      try { await send("Browser.close"); } catch { /* closing */ }
      ws.close();
      if (process.platform === "win32") spawnSync("taskkill", ["/T", "/F", "/PID", String(proc.pid)], { stdio: "ignore" }); else proc.kill();
      await sleep(300);
      try { rmSync(profile, { recursive: true, force: true }); } catch { /* still in use */ }
    }
  };
  return b;
}
