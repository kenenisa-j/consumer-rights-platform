"use client";

import { useState, type FormEvent } from "react";
import type { GovLevel } from "@/types/gov";
import { CATEGORY_LISTS } from "@/mocks/gov-admin";
import { Alert } from "@/components/ui/Display";
import { Dialog } from "@/components/ui/Dialog";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { addCategory, canEditCategories, removeCategory, renameCategory, type CatItem } from "./admin-state";

type Lists = Record<string, CatItem[]>;
type Mode = { kind: "add"; list: string } | { kind: "rename"; list: string; item: CatItem } | { kind: "remove"; list: string; item: CatItem } | { kind: "suggest" } | null;

/** The lists used on forms. Only the City Bureau edits them; the others see them read-only and suggest changes. */
export function CategoriesView({ level }: { level: GovLevel }) {
  const editable = canEditCategories(level);
  const [lists, setLists] = useState<Lists>(() => Object.fromEntries(CATEGORY_LISTS.map(l => [l.key, l.items])));
  const [mode, setMode] = useState<Mode>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const close = () => { setMode(null); setError(null); };

  const apply = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!mode) return;
    const name = String(new FormData(e.currentTarget).get("name") ?? "");
    if (mode.kind === "suggest") { setNotice("Your suggestion was sent to the City Bureau."); close(); return; }
    const list = lists[mode.list];
    const r = mode.kind === "add" ? addCategory(list, name) : mode.kind === "rename" ? renameCategory(list, mode.item.id, name) : removeCategory(list, mode.item.id);
    if (!r.ok) { setError(r.notice); return; }
    setLists(ls => ({ ...ls, [mode.list]: r.list })); setNotice(r.notice); close();
  };

  return (
    <>
      <div className="ws-title"><div><h1>Categories</h1><p>{editable ? "The lists used on complaint and tip forms. Changes show on the public forms at once." : "The lists used on complaint and tip forms."}</p></div>
        {!editable && <button className="btn btn--accent" type="button" onClick={() => setMode({ kind: "suggest" })}>Suggest a change</button>}</div>
      <div className="stack">
        {notice && <Alert tone="ok" icon="check" role="status" title={notice} />}
        {!editable && <Alert icon="building" title="The same in every office">So that reports can be compared, the City Bureau manages these lists for the whole city. You can suggest a change.</Alert>}
        {CATEGORY_LISTS.map(l => (
          <div className="card" key={l.key}>
            <div className="card-head"><h2>{l.title}</h2>{editable && <button className="btn btn--secondary btn--sm" type="button" onClick={() => setMode({ kind: "add", list: l.key })}>Add<span className="visually-hidden"> to {l.title}</span></button>}</div>
            <ul className="link-list">{lists[l.key].filter(i => !i.retired).map(i => (
              <li key={i.id}><span style={{ flex: 1 }}>{i.name}</span>
                {editable && <span className="btn-row" style={{ margin: 0 }}>
                  <button className="btn btn--ghost btn--sm" type="button" onClick={() => setMode({ kind: "rename", list: l.key, item: i })}>Rename<span className="visually-hidden"> {i.name}</span></button>
                  <button className="btn btn--ghost btn--sm" type="button" onClick={() => setMode({ kind: "remove", list: l.key, item: i })}>Remove<span className="visually-hidden"> {i.name}</span></button></span>}</li>))}</ul>
          </div>
        ))}
      </div>

      <Dialog open={!!mode} onClose={close} title={mode?.kind === "add" ? "Add an item" : mode?.kind === "rename" ? "Rename an item" : mode?.kind === "remove" ? "Remove this item?" : "Suggest a change"}>
        {error && <div className="field-error-summary"><Alert tone="bad" icon="flag" role="alert" title={error} /></div>}
        <form onSubmit={apply}>
          {mode?.kind === "remove" && <p>&ldquo;{mode.item.name}&rdquo; no longer shows on new forms. Complaints already using it keep it.</p>}
          {(mode?.kind === "add" || mode?.kind === "rename") && <TextField id="cat-name" name="name" label={mode.kind === "add" ? "Name" : "New name"} required minLength={2} maxLength={80} defaultValue={mode.kind === "rename" ? mode.item.name : ""} invalid="Write a name." />}
          {mode?.kind === "suggest" && <TextAreaField id="cat-suggest" name="name" label="What should change, and why?" required minLength={10} maxLength={600} invalid="Describe the change (at least 10 characters)." />}
          <div className="btn-row"><button className={`btn${mode?.kind === "remove" ? " btn--danger" : ""}`} type="submit">{mode?.kind === "remove" ? "Remove" : mode?.kind === "suggest" ? "Send to the City Bureau" : "Save"}</button>
            <button className="btn btn--secondary" type="button" onClick={close}>Cancel</button></div>
        </form>
      </Dialog>
    </>
  );
}
