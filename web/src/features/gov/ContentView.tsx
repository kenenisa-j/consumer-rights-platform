"use client";

import { useState, type FormEvent } from "react";
import type { GovLevel } from "@/types/gov";
import { CONTENT, CONTENT_INTRO } from "@/mocks/gov-admin";
import { Alert, StatusPill } from "@/components/ui/Display";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { approveNotice, CITY_TYPES, LOCAL_TYPES, saveContent, sendBackNotice, type ContentItem, type ContentStatus } from "./admin-state";

type Mode = { kind: "edit"; item?: ContentItem } | { kind: "back"; item: ContentItem } | null;
const TONE: Record<ContentStatus, "ok" | "warn" | "grey" | "info"> = { Published: "ok", "Waiting for the Sub-City": "warn", Draft: "info", Archived: "grey" };
const today = () => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date());

/** Public content of one level: local notices (Woreda, Sub-City) or rights, laws, guides and news (City Bureau). */
export function ContentView({ level }: { level: GovLevel }) {
  const [items, setItems] = useState<ContentItem[]>(CONTENT[level]);
  const [mode, setMode] = useState<Mode>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const types = level === "bureau" ? CITY_TYPES : LOCAL_TYPES;
  const close = () => { setMode(null); setError(null); };
  const done = (r: { list: ContentItem[]; ok: boolean; notice: string }) => { if (r.ok) setItems(r.list); setNotice({ text: r.notice, ok: r.ok }); };

  const save = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (mode?.kind !== "edit") return;
    const d = new FormData(e.currentTarget);
    const s = (k: string) => String(d.get(k) ?? "");
    const r = saveContent(level, items, { title: s("title"), type: s("type"), body: s("body"), from: s("from") || undefined, status: (s("status") as ContentStatus) || undefined }, today(), mode.item?.id);
    if (!r.ok) { setError(r.notice); return; }
    done(r); close();
  };
  const sendBack = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (mode?.kind !== "back") return;
    const r = sendBackNotice(level, items, mode.item.id, String(new FormData(e.currentTarget).get("reason") ?? ""), today());
    if (!r.ok) { setError(r.notice); return; }
    done(r); close();
  };

  const waiting = level === "subcity" ? items.filter(i => i.status === "Waiting for the Sub-City" && i.author) : [];
  const item = mode?.kind === "edit" ? mode.item : undefined;
  const submitLabel = level === "woreda" ? "Send to the Sub-City for approval" : level === "subcity" ? "Publish" : "Save";

  return (
    <>
      <div className="ws-title"><div><h1>Public content</h1><p>{CONTENT_INTRO[level]}</p></div>
        <button className="btn btn--accent" type="button" onClick={() => setMode({ kind: "edit" })}>{level === "bureau" ? "New item" : "New notice"}</button></div>
      <div className="stack">
        {notice && <Alert tone={notice.ok ? "ok" : "bad"} icon={notice.ok ? "check" : "flag"} role="status" title={notice.text} />}
        {waiting.map(w => (
          <div className="card card--accent" key={w.id}>
            <span className="status status--warn">Waiting for your approval</span>
            <h2 className="mt-4">{w.title}</h2><p className="small muted">From {w.author} · {w.updated}</p><p>{w.body}</p>
            <div className="btn-row">
              <button className="btn btn--accent" type="button" onClick={() => done(approveNotice(level, items, w.id, today()))}>Approve and publish</button>
              <button className="btn btn--secondary" type="button" onClick={() => setMode({ kind: "back", item: w })}>Send back</button></div>
          </div>
        ))}
        <div className="table-wrap"><table className="table table--stack">
          <caption className="visually-hidden">{level === "bureau" ? "Public content" : "Local notices"}</caption>
          <thead><tr><th scope="col">Title</th><th scope="col">Type</th><th scope="col">Status</th><th scope="col">Updated</th><th scope="col"><span className="visually-hidden">Action</span></th></tr></thead>
          <tbody>{items.map(i => (
            <tr key={i.id}><td><b>{i.title}</b>{i.sentBack && <small>Sent back: {i.sentBack}</small>}</td><td data-label="Type">{i.type}</td>
              <td data-label="Status"><StatusPill tone={TONE[i.status]}>{i.status}</StatusPill></td><td data-label="Updated">{i.updated}</td>
              <td className="num"><button className="btn btn--secondary btn--sm" type="button" onClick={() => setMode({ kind: "edit", item: i })}>Edit<span className="visually-hidden"> {i.title}</span></button></td></tr>))}</tbody>
        </table></div>
        {level !== "bureau" && <p className="small muted">Rights articles, laws and city-wide news are managed by the City Bureau.</p>}
      </div>

      <Dialog open={mode?.kind === "edit"} onClose={close} title={item ? (level === "bureau" ? "Edit item" : "Edit notice") : (level === "bureau" ? "New item" : "New notice")}>
        {error && <div className="field-error-summary"><Alert tone="bad" icon="flag" role="alert" title={error} /></div>}
        <form onSubmit={save}>
          <TextField id="ct-title" name="title" label="Title" required minLength={3} maxLength={160} defaultValue={item?.title} invalid="Write a title." />
          <SelectField id="ct-type" name="type" label="Type" required options={types} defaultValue={item?.type} />
          {level === "bureau" ? <SelectField id="ct-status" name="status" label="Status" required options={["Draft", "Published", "Archived"]} defaultValue={item?.status === "Waiting for the Sub-City" ? "Draft" : item?.status ?? "Draft"} />
            : <TextField id="ct-from" name="from" label="Show from" optional type="date" />}
          <TextAreaField id="ct-body" name="body" label="Text" optional maxLength={4000} defaultValue={item?.body} />
          <div className="btn-row"><button className="btn" type="submit">{submitLabel}</button><button className="btn btn--secondary" type="button" onClick={close}>Cancel</button></div>
        </form>
      </Dialog>

      <Dialog open={mode?.kind === "back"} onClose={close} title="Send back">
        {error && <div className="field-error-summary"><Alert tone="bad" icon="flag" role="alert" title={error} /></div>}
        <form onSubmit={sendBack}>
          <p>The notice goes back to the Woreda as a draft, with your note.</p>
          <TextAreaField id="sb-reason" name="reason" label="What should change?" required minLength={5} maxLength={400} invalid="Tell the Woreda what to change." />
          <div className="btn-row"><button className="btn" type="submit">Send back</button><button className="btn btn--secondary" type="button" onClick={close}>Cancel</button></div>
        </form>
      </Dialog>
    </>
  );
}
