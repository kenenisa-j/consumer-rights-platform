"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CONVERSATIONS, type ChatItem, type Conversation, type OfferStatus } from "@/mocks/conversations";
import { OFFER_LABELS } from "@/content/common";
import { bi } from "@/content/types";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";

const now = () => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date());
const STATUS_TEXT: Record<OfferStatus, string> = { waiting: "Waiting for an answer", accepted: "Accepted", declined: "Not agreed" };

function Bubble({ item, onAnswer }: { item: ChatItem; onAnswer: (id: string, status: OfferStatus) => void }) {
  if (item.kind === "sys") return <div className="msg msg--sys">{item.text}<time>{item.when}</time></div>;
  if (item.kind === "msg") return (
    <div className={`msg${item.from === "me" ? " msg--me" : ""}`}><span className="msg__who">{item.who}</span><p>{item.text}</p><time>{item.when}</time></div>
  );
  return (
    <div className={`offer-card${item.from === "me" ? " offer-card--me" : ""}`}>
      <span className="kicker">{item.from === "me" ? "Your offer" : `Offer from ${item.who}`}</span>
      <b>{item.title}</b><p>{item.text}</p>
      <span className={`status status--${item.status === "accepted" ? "ok" : item.status === "waiting" ? "warn" : "bad"}`}>{STATUS_TEXT[item.status]}</span>
      {item.from === "them" && item.status === "waiting" && (
        <div className="btn-row mt-4">
          <button className="btn btn--accent btn--sm" type="button" onClick={() => onAnswer(item.id, "accepted")}>Accept</button>
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => onAnswer(item.id, "declined")}>Not agree</button>
        </div>
      )}
      <time>{item.when}</time>
    </div>
  );
}

/** Conversations with the business and each office. Only the office holding the case now accepts new messages. */
export function MessagesView() {
  const [chats, setChats] = useState<readonly Conversation[]>(CONVERSATIONS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [sent, setSent] = useState("");
  const active = chats.find(c => c.id === activeId) ?? null;

  const update = (id: string, fn: (c: Conversation) => Conversation) => setChats(cs => cs.map(c => (c.id === id ? fn(c) : c)));
  const append = (item: ChatItem, preview: string) => active && update(active.id, c => ({ ...c, preview, day: "Today", items: [...c.items, item] }));

  const send = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const text = String(new FormData(form).get("message") ?? "").trim();
    if (!text || !active) return;
    append({ kind: "msg", id: `m${Date.now()}`, from: "me", who: "You", text, when: now() }, text);
    setSent("Sent."); form.reset();
  };
  const sendOffer = (d: FormData) => {
    const type = String(d.get("type") ?? "Refund");
    const amount = String(d.get("amount") ?? "").trim();
    append({ kind: "offer", id: `o${Date.now()}`, from: "me", who: "You", status: "waiting", when: now(),
      title: `${type}${amount ? `: ${amount} ETB` : ""}`, text: String(d.get("message") ?? "") }, `Offer: ${type}`);
    setOfferOpen(false); setSent("Offer sent.");
  };
  const answer = (id: string, status: OfferStatus) => active && update(active.id, c => ({
    ...c, items: c.items.map(i => (i.id === id && i.kind === "offer" ? { ...i, status } : i)) }));

  return (
    <>
      <p className="small muted" role="status">{sent}</p>
      <div className={`chat${active ? " chat--thread-open" : ""}`}>
        <div className="chat-list">
          <h2>Conversations</h2>
          {chats.map(c => (
            <button key={c.id} type="button" className="chat-item" aria-current={c.id === activeId}
              onClick={() => { setActiveId(c.id); setSent(""); }}>
              <span className="avatar" aria-hidden="true">{c.initials}</span>
              <span className="chat-item__text"><b>{c.name}</b><small>{c.caseRef}</small><span>{c.preview}</span></span>
              <time>{c.day}</time>
            </button>
          ))}
        </div>
        <div className="chat-panes">
          {!active ? <div className="card center" style={{ border: 0 }}><p className="muted">Choose a conversation.</p></div> : (
            <div className="chat-pane is-open">
              <div className="chat-pane__head">
                <div><b>{active.name}</b><small>{active.role}</small></div>
                <div className="btn-row">
                  <button className="btn btn--ghost btn--sm" type="button" onClick={() => setActiveId(null)}>All conversations</button>
                  <Link className="btn btn--secondary btn--sm" href={`/cases/${active.caseRef}`}>Open the case</Link>
                </div>
              </div>
              <div className="chat-feed" tabIndex={0} aria-label={`Messages with ${active.name}`}>
                {active.items.map(i => <Bubble key={i.id} item={i} onAnswer={answer} />)}
              </div>
              {active.open ? (
                <form className="chat-compose" onSubmit={send}>
                  <label className="visually-hidden" htmlFor="chat-message">Write a message to {active.name}</label>
                  <textarea id="chat-message" className="textarea" name="message" required maxLength={1000} placeholder={`Write a message to ${active.name}`} />
                  <div className="btn-row">
                    <button className="btn btn--secondary btn--sm" type="button" onClick={() => setOfferOpen(true)}>Make an offer</button>
                    <button className="btn" type="submit">Send</button>
                  </div>
                </form>
              ) : <p className="chat-compose small muted mb-0">{active.closedNote}</p>}
            </div>
          )}
        </div>
      </div>
      <Dialog open={offerOpen} onClose={() => setOfferOpen(false)} title={bi("Make an offer", "ሃሳብ ያቅርቡ")}>
        <p>The other side can accept it, answer it, or make a counter-offer.</p>
        <form onSubmit={e => { e.preventDefault(); sendOffer(new FormData(e.currentTarget)); }}>
          <SelectField id="of-type" name="type" label="What do you offer?" options={Object.values(OFFER_LABELS)} defaultValue="Refund" />
          <TextField id="of-amount" name="amount" label="Amount (ETB)" optional type="number" min="0" inputMode="numeric" />
          <TextField id="of-by" name="by" label="By" optional type="date" />
          <TextAreaField id="of-msg" name="message" label="Message" optional maxLength={300} />
          <div className="btn-row"><button className="btn" type="submit">Send the offer</button>
            <button className="btn btn--secondary" type="button" onClick={() => setOfferOpen(false)}>Cancel</button></div>
        </form>
      </Dialog>
    </>
  );
}
