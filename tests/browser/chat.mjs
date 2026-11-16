// Messenger and business desk check: text and voice messages between the consumer, the business and an office, stored in the
// database, with the business seeing only "Consumer 0000N". Needs the API (seeded) and the site. The driver gives Chrome a fake microphone.
// Run: `TEST_BASE_URL=http://localhost:3300 node tests/browser/chat.mjs`.
import { launch } from "../../scripts/browser/driver.mjs";

const b = await launch();
await b.device(1280, 900, false);
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + detail}`); };
const stamp = Date.now().toString(36);
const feed = () => b.text(".tg-feed");
const openChat = async (name) => {
  await b.waitFor(`[...document.querySelectorAll('.tg-chat')].some(e => e.textContent.includes(${JSON.stringify(name)}))`, 15000);
  await b.ev(`[...document.querySelectorAll('.tg-chat')].find(e => e.textContent.includes(${JSON.stringify(name)})).click(); return 1`);
  await b.waitFor("document.querySelector('.tg-head')"); await b.sleep(900);
};
const write = async (text) => {
  await b.type("#tg-text", text); await b.sleep(200);
  await b.click(".tg-compose .tg-round"); await b.sleep(1200);
};
const voice = async () => {
  await b.click("button[aria-label='Record a voice message']"); await b.waitFor("document.querySelector('.tg-rec')");
  await b.sleep(1600);
  const recording = await b.ev("return !!document.querySelector('.tg-rec__dot')");
  await b.click("button[aria-label='Send the voice message']"); await b.sleep(1800);
  return recording;
};

try {
  // ---- The consumer writes to the business (a text and a voice message) -----------------------------
  await b.go("/messages");
  await openChat("Gebriel Grain Traders");
  check("chat: a Telegram-style screen (list, header, composer)", await b.ev("return !!document.querySelector('.tg-list') && !!document.querySelector('.tg-head') && !!document.querySelector('.tg-compose textarea')"));
  check("chat: the round button is a microphone while the box is empty", await b.ev("return !!document.querySelector('button[aria-label=\"Record a voice message\"]')"));
  await b.type("#tg-text", `Hello business ${stamp}`); await b.sleep(250);
  check("chat: it turns into a send button when there is text", await b.ev("return !!document.querySelector('button[aria-label=\"Send the message\"]')"));
  await b.click(".tg-compose .tg-round"); await b.sleep(1300);
  check("chat: the sent text is in the chat", (await feed()).includes(`Hello business ${stamp}`));
  const wasRecording = await voice();
  check("chat: recording shows a timer and a red dot", wasRecording);
  check("chat: the voice message appears as a playable bubble", await b.ev("return document.querySelectorAll('.tg-msg--me .voice').length >= 1"));
  const audioStatus = await b.ev(`const id = (await (await fetch('/api/messages/conversations')).json()).data.find(c => c.name.includes('Gebriel')).id;
    const t = (await (await fetch('/api/messages/conversations/' + id)).json()).data;
    const m = t.messages.filter(x => x.kind === 'voice').pop(); if (!m) return 'none';
    const r = await fetch('/api/messages/audio/' + m.id); return r.status + ' ' + r.headers.get('content-type') + ' ' + (await r.arrayBuffer()).byteLength`);
  check("chat: the recording is stored and served back", /^200 audio\/\S+ [1-9]\d+/.test(audioStatus), audioStatus);
  await b.click(".voice__btn"); await b.sleep(800);
  check("chat: playing a voice message does not fail", !/Could not play/.test(await feed()));

  // ---- The business sees it, as a number, and answers ---------------------------------------------
  await b.go("/business/messages");
  await openChat("Consumer ");
  const bizFeed = await feed();
  check("business chat: the consumer's text arrived", bizFeed.includes(`Hello business ${stamp}`), bizFeed.slice(0, 200));
  check("business chat: the voice message arrived", await b.ev("return document.querySelectorAll('.voice').length >= 1"));
  const names = await b.text(".tg");
  check("business chat: the consumer is only a number, never a name", /Consumer \d{5}/.test(names) && !/Hirut|Alemu|\+2519/.test(names), names.slice(0, 200));
  await write(`Reply from the business ${stamp}`);
  check("business chat: the business can answer", (await feed()).includes(`Reply from the business ${stamp}`));
  await voice();
  check("business chat: the business can send a voice message too", await b.ev("return document.querySelectorAll('.tg-msg--me .voice').length >= 1"));

  // ---- The consumer reads the answer --------------------------------------------------------------
  await b.go("/messages?case=");
  await openChat("Gebriel Grain Traders");
  check("chat: the consumer sees the business's answer", (await feed()).includes(`Reply from the business ${stamp}`));
  check("chat: and its voice message", await b.ev("return document.querySelectorAll('.tg-msg:not(.tg-msg--me) .voice').length >= 1"));

  // ---- An office: the Woreda holds the kettle complaint --------------------------------------------
  await b.go("/woreda/messages");
  await openChat("Hirut Alemu");
  await write(`The officer replies ${stamp}`);
  check("office chat: the officer sees the consumer's name and can write", (await feed()).includes(`The officer replies ${stamp}`));
  const woredaList = await b.text(".tg-list");
  check("office chat: a Woreda does not see a complaint held by the City Bureau", !/Sugar sold above/.test(woredaList), woredaList.slice(0, 200));
  await b.go("/messages");
  await openChat("Akaki Kality Woreda 7");
  check("chat: the consumer reads the officer's message", (await feed()).includes(`The officer replies ${stamp}`));

  // ---- Business desk: every tab and the profile menu work -----------------------------------------
  await b.go("/business/overview");
  check("business: overview greets the signed-in business from the database", /Gebriel Grain Traders/.test(await b.text("main")) && /complaint/.test(await b.text("main")));
  for (const [label, expect] of [["Consumer complaints", /Consumer complaints/], ["Messages", /Messages/], ["Business profile", /Registration number/], ["Stock and prices", /Stock and prices/], ["Orders", /Orders/], ["Overview", /Good (morning|afternoon|evening)/]]) {
    await b.clickText(label, ".rail a"); await b.waitFor(`document.querySelector('main') && ${expect}.test(document.querySelector('main').innerText)`, 8000);
    check(`business: the "${label}" tab opens`, expect.test(await b.text("main")), await b.url());
  }
  await b.click(".ws-account summary"); await b.sleep(300);
  check("business: the profile picture opens a menu", await b.ev("return !!document.querySelector('.ws-account[open] .ws-account__menu') && document.querySelector('.ws-account__menu').innerText.includes('Sign out')"));
  await b.clickText("Business profile", ".ws-account__menu a"); await b.waitFor("location.pathname==='/business/profile'");
  check("business: the menu leads to the profile", (await b.url()) === "/business/profile" && /AA-TRD-0001/.test(await b.text("main")), await b.url());
  await b.go("/business/complaints");
  const sidebar = await b.text(".rail");
  check("business: the sidebar count is real (no fake numbers)", !/Orders\s*2/.test(sidebar));
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
