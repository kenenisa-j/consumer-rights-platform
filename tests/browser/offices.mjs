// Offices check: a consumer and the City Bureau really talk to each other (each side sees what the other writes), and an office can send
// a case to another office (Bureau to a Woreda, Woreda up to its Sub-City, Sub-City down to a Woreda or up to the Bureau) with the rules
// enforced by the API. Needs the API (seeded) and the site. Run: `TEST_BASE_URL=http://localhost:3300 node tests/browser/offices.mjs`.
import { launch } from "../../scripts/browser/driver.mjs";

const b = await launch();
await b.device(1280, 900, false);
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + detail}`); };
const stamp = Date.now().toString(36).toUpperCase();
let reference = "";

const feed = () => b.text(".tg-feed");
const openChat = async (name) => {
  await b.waitFor(`[...document.querySelectorAll('.tg-chat')].some(e => e.textContent.includes(${JSON.stringify(name)}))`, 15000);
  await b.ev(`[...document.querySelectorAll('.tg-chat')].find(e => e.textContent.includes(${JSON.stringify(name)})).click(); return 1`);
  await b.waitFor("document.querySelector('.tg-head')"); await b.sleep(900);
};
const write = async (text) => { await b.type("#tg-text", text); await b.sleep(200); await b.click(".tg-compose .tg-round"); await b.sleep(1300); };
const api = (method, path, body) => b.ev(`const r = await fetch(${JSON.stringify(path)}, { method: ${JSON.stringify(method)}, headers: { 'Content-Type': 'application/json' }, body: ${body ? JSON.stringify(JSON.stringify(body)) : "undefined"} }); let j = null; try { j = await r.json(); } catch {} return { status: r.status, j };`);
const redirectVia = async (radio, picks, note) => {
  await b.clickText("Send to another office", "button");
  await b.waitFor("document.querySelector('dialog[open] input[name=where]')", 10000);
  await b.click(`dialog[open] input[name=where][value=${radio}]`); await b.sleep(300);
  for (const [sel, label] of picks) await b.pick(sel, label);
  await b.type("#rd-note", note); await b.sleep(200);
  await b.click("dialog[open] button[type=submit]");
};

try {
  // ---- A complaint sent to the City Bureau ----------------------------------------------------------
  await b.go("/my-cases");
  const made = await api("POST", "/api/complaints", { category: "wrong_weight_measure", subject: `Offices test ${stamp}`, narrative: "I bought a 25 kg sack of rice and it weighed 21 kg with stones in it.",
    destination: "bureau", otherBusinessName: "Market stall 21", item: "Rice, 25 kg", purchasedOn: "2026-11-01", paid: 2250, want: "refund", wantAmount: 2250, contactPhone: "+251900000412" });
  reference = made.j?.data?.reference ?? "";
  check("setup: a complaint was sent to the City Bureau", made.status === 201 || made.status === 200 ? /^CC-/.test(reference) : false, JSON.stringify(made));

  // ---- Consumer and City Bureau really talk ---------------------------------------------------------
  await b.go(`/messages?case=${reference}`);
  await b.waitFor("document.querySelector('.tg-head')", 15000); await b.sleep(800);
  await write(`Hello City Bureau ${stamp}`);
  check("chat: the consumer's message is in the chat", (await feed()).includes(`Hello City Bureau ${stamp}`));

  await b.go("/bureau/messages");
  await b.waitFor("document.querySelector('.tg-badge')", 15000);
  check("chat: the City Bureau sees an unread badge on the conversation", await b.ev("return !!document.querySelector('.tg-badge')"));
  check("chat: and the Messages menu counts it", /\d/.test(await b.text(".rail a[href='/bureau/messages']")));
  await openChat("Hirut Alemu");
  check("chat: the City Bureau reads what the consumer wrote", (await feed()).includes(`Hello City Bureau ${stamp}`));
  await write(`Bureau answers ${stamp}`);
  check("chat: the City Bureau's answer is in its chat", (await feed()).includes(`Bureau answers ${stamp}`));
  check("chat: reading cleared the unread badge", !(await b.ev("return !!document.querySelector('.tg-chat[aria-current=true] .tg-badge')")));

  await b.go(`/messages?case=${reference}`);
  await b.waitFor("document.querySelector('.tg-head')", 15000); await b.sleep(900);
  const consumerFeed = await feed();
  check("chat: the consumer sees the City Bureau's answer", consumerFeed.includes(`Bureau answers ${stamp}`), consumerFeed.slice(0, 200));
  check("chat: it is labelled with the officer and the office", /Bureau of Trade/.test(consumerFeed) || /Abel Kebede/.test(consumerFeed), consumerFeed.slice(0, 300));

  // ---- The City Bureau sends the case down to a Woreda ----------------------------------------------
  await b.go(`/bureau/cases/${reference}`);
  await redirectVia("woreda", [["#rd-wsub", "Akaki Kality"], ["#rd-wo", "Woreda 7"]], `Please resolve this at the market ${stamp}`);
  await b.waitFor("location.pathname==='/bureau/cases'", 15000); await b.sleep(900);
  check("redirect: the City Bureau gets a confirmation", /was sent to Akaki Kality Woreda 7/.test(await b.text("main")), (await b.text("main")).slice(0, 200));

  // the Woreda now holds it, with the whole conversation
  await b.go("/woreda/cases");
  check("redirect: Woreda 7 now has the case", (await b.text("main")).includes(reference));
  await b.go("/woreda/messages");
  await openChat("Hirut Alemu");
  const wf = await feed();
  check("chat: the Woreda officer sees the earlier conversation too", wf.includes(`Hello City Bureau ${stamp}`) && wf.includes(`Bureau answers ${stamp}`), wf.slice(0, 200));
  await write(`Woreda 7 here ${stamp}`);
  await b.go(`/messages?case=${reference}`);
  await b.waitFor("document.querySelector('.tg-head')", 15000); await b.sleep(900);
  const cf = await feed();
  check("chat: the consumer now talks to Woreda 7 and sees its message", cf.includes(`Woreda 7 here ${stamp}`) && /Woreda 7/.test(await b.text(".tg-head")), cf.slice(0, 200));
  await b.go(`/cases/${reference}`);
  check("redirect: the consumer's case page says where it went", /Akaki Kality Woreda 7/.test(await b.text("main")));

  // ---- Rules: a Woreda may go only to its own Sub-City or the Bureau ---------------------------------
  await b.go(`/woreda/cases/${reference}`);
  const otherWoreda = await api("POST", `/api/office/cases/${reference}/redirect`, { level: "woreda", subcityCode: "BOLE", woreda: 3, note: "Trying to send to a Woreda of another Sub-City" });
  check("rules: a Woreda cannot send a case to another Sub-City's Woreda", otherWoreda.status === 403, JSON.stringify(otherWoreda));
  const noNote = await api("POST", `/api/office/cases/${reference}/redirect`, { level: "bureau", note: "short" });
  check("rules: a handover note is required", noNote.status === 400, JSON.stringify(noNote));
  const opts = await api("GET", "/api/office/redirect-options");
  check("rules: a Woreda is offered only the Bureau and its own Sub-City", opts.j?.data?.level === "woreda" && opts.j.data.woreda === false && opts.j.data.subcities.length === 1, JSON.stringify(opts.j?.data));

  // ---- Woreda sends it up to its Sub-City -----------------------------------------------------------
  await redirectVia("subcity", [], `Needs the Sub-City ${stamp}`);
  await b.waitFor("location.pathname==='/woreda/cases'", 15000); await b.sleep(800);
  await b.go("/subcity/cases");
  check("redirect: the Sub-City now has it", (await b.text("main")).includes(reference));
  await b.go("/woreda/messages"); await b.sleep(1200);
  check("chat: the Woreda no longer sees the conversation (it moved on)", !(await b.text(".tg-list")).includes("Hirut Alemu") || !(await b.text(".tg-list")).includes(reference));

  // ---- Sub-City: down to a Woreda of its own, or up to the Bureau -----------------------------------
  await b.go(`/subcity/cases/${reference}`);
  const subOpts = await api("GET", "/api/office/redirect-options");
  check("rules: a Sub-City is offered the Bureau and Woredas of its own Sub-City only", subOpts.j?.data?.level === "subcity" && subOpts.j.data.bureau === true && subOpts.j.data.woredaSubcities.length === 1 && subOpts.j.data.woredaSubcities[0].woredas.length === 13, JSON.stringify(subOpts.j?.data));
  const subOther = await api("POST", `/api/office/cases/${reference}/redirect`, { level: "woreda", subcityCode: "BOLE", woreda: 3, note: "Trying a Woreda of another Sub-City" });
  check("rules: a Sub-City cannot send to another Sub-City's Woreda", subOther.status === 403, JSON.stringify(subOther));
  await redirectVia("woreda", [["#rd-wo", "Woreda 7"]], `Back to the Woreda for a visit ${stamp}`);
  await b.waitFor("location.pathname==='/subcity/cases'", 15000);
  await b.go("/woreda/cases");
  check("redirect: a Sub-City can send it down to its Woreda", (await b.text("main")).includes(reference));

  // ---- Woreda up to the Bureau, and the history shows every step ---------------------------------------
  await b.go(`/woreda/cases/${reference}`);
  await redirectVia("bureau", [], `Escalating to the City Bureau ${stamp}`);
  await b.waitFor("location.pathname==='/woreda/cases'", 15000);
  await b.go(`/bureau/cases/${reference}`);
  const hist = await b.text("main");
  check("redirect: the City Bureau has it again, with the whole history", /passed to Akaki Kality Woreda 7/.test(hist) && /passed to Akaki Kality Sub-City/.test(hist) && /Bureau of Trade/.test(hist), hist.slice(0, 400));
  await b.go("/my-cases");
  check("redirect: the consumer's case history records every step", (await api("GET", "/api/complaints/" + reference)).j?.data?.history?.length >= 5);
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
