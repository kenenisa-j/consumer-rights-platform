"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { mmss, VoiceBubble } from "./VoiceBubble";
import { useRecorder, type Recording } from "./useRecorder";

interface ConvRow { id: string; caseRef: string; title: string; name: string; subtitle: string; open: boolean; preview: string; lastAt: string; lastMine: boolean; unread: number }
interface Msg { id: string; mine: boolean; who: string; kind: "text" | "voice"; text: string; durationMs: number | null; sentAt: string; sending?: boolean; localUrl?: string }
interface Thread { id: string; caseRef: string; title: string; name: string; open: boolean; closedNote: string | null; messages: Msg[] }

const initials = (name: string) => name.replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join("") || "?";
const hue = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const Avatar = ({ name, size = 48 }: { name: string; size?: number }) => (
  <span className="tg-avatar" aria-hidden="true" style={{ width: size, height: size, background: `hsl(${hue(name)} 45% 42%)` }}>{initials(name)}</span>
);
const clock = (iso: string) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Addis_Ababa" }).format(new Date(iso));
const dayOf = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date(iso));
function listTime(iso: string) {
  const d = new Date(iso), today = dayOf(new Date().toISOString());
  if (dayOf(iso) === today) return clock(iso);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Addis_Ababa" }).format(d);
}
const dayLabel = (iso: string) => {
  const today = dayOf(new Date().toISOString()), yest = dayOf(new Date(Date.now() - 86_400_000).toISOString());
  const d = dayOf(iso);
  return d === today ? "Today" : d === yest ? "Yesterday" : new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Addis_Ababa" }).format(new Date(iso));
};

const Icon = {
  send: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.4 20.4 21 12 3.4 3.6 3.3 10l12.6 2-12.6 2z" /></svg>,
  mic: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11z" /></svg>,
  trash: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4zM6 9h12l-1 12H7z" /></svg>,
  back: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z" /></svg>,
  tick: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" /></svg>
};

/**
 * A messenger in the style of Telegram: the conversations on the left, the chat on the right (full screen on a phone), bubbles with
 * the time inside, and one round button that sends text, or records a voice message when the box is empty.
 * `caseBase` is where "Open the case" goes. `focusCase` opens the conversation of that complaint.
 */
export function ChatApp({ caseBase, focusCase }: { caseBase: string; focusCase?: string }) {
  const [list, setList] = useState<ConvRow[] | null>(null);
  const [down, setDown] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [text, setText] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const feed = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const input = useRef<HTMLTextAreaElement>(null);
  const recorder = useRecorder();
  const pinned = useRef(false);

  const loadList = useCallback(async () => {
    const r = await apiGet<ConvRow[]>("/api/messages/conversations");
    if (!r.ok) { setDown(true); return; }
    setDown(false); setList(r.data);
    if (!pinned.current && focusCase) {
      pinned.current = true;
      const hit = r.data.find(c => c.caseRef === focusCase);
      if (hit) setActiveId(hit.id);
    }
  }, [focusCase]);

  const loadThread = useCallback(async (id: string) => {
    const r = await apiGet<Thread>(`/api/messages/conversations/${id}`);
    if (r.ok) setThread(t => (t && t.id === id ? { ...r.data, messages: [...r.data.messages, ...t.messages.filter(m => m.sending)] } : r.data));
  }, []);

  useEffect(() => { void loadList(); }, [loadList]);
  useEffect(() => { setThread(null); if (activeId) { stick.current = true; void loadThread(activeId); } }, [activeId, loadThread]);
  useEffect(() => {
    const tick = () => { if (document.hidden) return; void loadList(); if (activeId) void loadThread(activeId); };
    const t = setInterval(tick, 2500); // a new message shows up within a couple of seconds, on either side
    window.addEventListener("focus", tick); document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(t); window.removeEventListener("focus", tick); document.removeEventListener("visibilitychange", tick); };
  }, [activeId, loadList, loadThread]);
  useEffect(() => { if (stick.current) feed.current?.scrollTo({ top: feed.current.scrollHeight }); }, [thread?.messages.length, activeId]);
  useEffect(() => { // grow the box with the text, like a messenger
    const el = input.current; if (!el) return;
    el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text]);

  const push = (m: Msg) => { stick.current = true; setThread(t => (t ? { ...t, messages: [...t.messages, m] } : t)); };

  const sendText = async (e?: FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || !activeId) return;
    setText(""); setSendError(null);
    push({ id: `tmp${Date.now()}`, mine: true, who: "You", kind: "text", text: body, durationMs: null, sentAt: new Date().toISOString(), sending: true });
    const r = await apiPost(`/api/messages/conversations/${activeId}/text`, { text: body });
    if (!r.ok) { setSendError(r.error); setText(body); setThread(t => t && { ...t, messages: t.messages.filter(m => !m.sending) }); return; }
    await loadThread(activeId); void loadList();
  };

  const sendVoice = useCallback(async (r: Recording) => {
    if (!activeId) return;
    setSendError(null);
    const local = URL.createObjectURL(r.blob);
    const tmp = `tmp${Date.now()}`;
    push({ id: tmp, mine: true, who: "You", kind: "voice", text: "", durationMs: r.ms, sentAt: new Date().toISOString(), sending: true, localUrl: local });
    const audio = await new Promise<string>(res => { const f = new FileReader(); f.onload = () => res(String(f.result).split(",")[1] ?? ""); f.readAsDataURL(r.blob); });
    const out = await apiPost(`/api/messages/conversations/${activeId}/voice`, { audio, mime: r.mime, durationMs: r.ms });
    if (!out.ok) { setSendError(out.error); setThread(t => t && { ...t, messages: t.messages.filter(m => m.id !== tmp) }); return; }
    await loadThread(activeId); void loadList();
  }, [activeId, loadThread, loadList]);

  useEffect(() => { // the recorder stops itself at 3 minutes: send what it has
    const h = (e: Event) => void sendVoice((e as CustomEvent<Recording>).detail);
    window.addEventListener("voice-auto-stop", h);
    return () => window.removeEventListener("voice-auto-stop", h);
  }, [sendVoice]);

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendText(); } };
  const stopAndSend = async () => { const r = await recorder.stop(); if (r && r.ms >= 500) await sendVoice(r); };

  const rows: (Msg | { divider: string; id: string })[] = [];
  let lastDay = "";
  for (const m of thread?.messages ?? []) {
    const d = dayOf(m.sentAt);
    if (d !== lastDay) { rows.push({ divider: dayLabel(m.sentAt), id: `d${d}` }); lastDay = d; }
    rows.push(m);
  }

  return (
    <div className={`tg${activeId ? " tg--open" : ""}`}>
      <aside className="tg-list" aria-label="Conversations">
        <div className="tg-list__head"><h2>Messages</h2></div>
        {down && <p className="tg-note" role="alert">We could not load your messages. Check your connection.</p>}
        {list === null && !down && <p className="tg-note" role="status">Loading…</p>}
        {list?.length === 0 && <p className="tg-note">No conversations yet. One opens for every complaint.</p>}
        <ul>
          {list?.map(c => (
            <li key={c.id}>
              <button type="button" className={`tg-chat${c.unread && c.id !== activeId ? " has-unread" : ""}`} aria-current={c.id === activeId ? "true" : undefined} onClick={() => setActiveId(c.id)}>
                <Avatar name={c.name} />
                <span className="tg-chat__body">
                  <span className="tg-chat__top"><b>{c.name}</b><time dateTime={c.lastAt}>{listTime(c.lastAt)}</time></span>
                  <span className="tg-chat__sub"><span className="tg-chat__prev">{c.lastMine && <em>You: </em>}{c.preview}</span>{c.unread > 0 && c.id !== activeId && <span className="tg-badge" aria-label={`${c.unread} unread`}>{c.unread}</span>}</span>
                  <span className="tg-chat__case">{c.caseRef}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="tg-pane" aria-label={thread ? `Chat with ${thread.name}` : "Chat"}>
        {!activeId ? (
          <div className="tg-empty"><span>Select a conversation to start messaging</span></div>
        ) : (
          <>
            <header className="tg-head">
              <button type="button" className="tg-icon tg-back" onClick={() => setActiveId(null)} aria-label="Back to conversations">{Icon.back}</button>
              <Avatar name={thread?.name ?? "…"} size={42} />
              <div className="tg-head__who"><b>{thread?.name ?? "Loading…"}</b><small>{thread ? `${thread.caseRef} · ${thread.title}` : ""}</small></div>
              {thread && <Link className="tg-open" href={`${caseBase}/${thread.caseRef}`}>Open the case</Link>}
            </header>
            <div className="tg-feed" ref={feed} onScroll={e => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }} tabIndex={0} aria-label="Messages" aria-live="polite">
              {thread && thread.messages.length === 0 && <p className="tg-note tg-note--center">No messages yet. Say hello.</p>}
              {rows.map((r, i) => "divider" in r ? <div className="tg-day" key={r.id}><span>{r.divider}</span></div> : (
                <div key={r.id} className={`tg-msg${r.mine ? " tg-msg--me" : ""}${r.sending ? " is-sending" : ""}`}>
                  <div className="tg-bubble">
                    {!r.mine && (rows[i - 1] as Msg | undefined)?.who !== r.who && <span className="tg-bubble__who" style={{ color: `hsl(${hue(r.who)} 55% 35%)` }}>{r.who}</span>}
                    {r.kind === "voice" ? <VoiceBubble id={r.id} durationMs={r.durationMs ?? 0} src={r.localUrl} /> : <p>{r.text}</p>}
                    <span className="tg-meta"><time dateTime={r.sentAt}>{clock(r.sentAt)}</time>{r.mine && <i className={r.sending ? "" : "sent"}>{Icon.tick}</i>}</span>
                  </div>
                </div>
              ))}
            </div>
            {(sendError || recorder.error) && <p className="tg-error" role="alert">{sendError ?? recorder.error}</p>}
            {thread && !thread.open ? <p className="tg-closed">{thread.closedNote}</p> : (
              <form className="tg-compose" onSubmit={sendText}>
                {recorder.recording ? (
                  <>
                    <button type="button" className="tg-icon tg-icon--danger" onClick={() => void recorder.cancel()} aria-label="Cancel the recording">{Icon.trash}</button>
                    <div className="tg-rec" role="status"><i className="tg-rec__dot" aria-hidden="true" /><b>{mmss(recorder.ms)}</b><span>Recording… tap send when you are done</span></div>
                    <button type="button" className="tg-round" onClick={() => void stopAndSend()} aria-label="Send the voice message">{Icon.send}</button>
                  </>
                ) : (
                  <>
                    <label className="visually-hidden" htmlFor="tg-text">Write a message</label>
                    <textarea id="tg-text" ref={input} rows={1} value={text} maxLength={2000} placeholder="Message" onChange={e => setText(e.target.value)} onKeyDown={onKey} />
                    {text.trim() ? (
                      <button type="submit" className="tg-round" aria-label="Send the message">{Icon.send}</button>
                    ) : (
                      <button type="button" className="tg-round tg-round--mic" onClick={() => void recorder.start()} aria-label="Record a voice message">{Icon.mic}</button>
                    )}
                  </>
                )}
              </form>
            )}
          </>
        )}
      </section>
    </div>
  );
}
