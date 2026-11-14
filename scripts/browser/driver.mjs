// Small browser driver over the Chrome DevTools Protocol. No dependencies: it uses Node's built-in WebSocket and
// whatever Chromium-based browser is installed (Edge, Chrome or Chromium). Used by tests/browser/*.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

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
  const proc = spawn(findBrowser(), ["--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    "--no-first-run", "about:blank"], { stdio: "ignore" });

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
    if (m.method === "Runtime.exceptionThrown") errors.push(`exception: ${m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text}`);
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(`console.error: ${m.params.args.map(a => a.value ?? a.description).join(" ")}`);
    if (m.method === "Log.entryAdded" && m.params.entry.level === "error") errors.push(`log: ${m.params.entry.text} ${m.params.entry.url ?? ""}`);
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
    async go(url) {
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
