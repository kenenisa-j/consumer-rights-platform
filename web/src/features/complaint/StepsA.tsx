"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CATEGORY_TEXT } from "@/content/common";
import { apiGet } from "@/lib/api";
import type { RefData } from "@/lib/reference";
import { CheckField, ChoiceGroup, TextAreaField, TextField } from "@/components/ui/Field";
import { ComboField } from "@/components/ui/ComboField";
import { Am } from "@/components/ui/Bi";
import { Icon } from "@/components/ui/Icon";
import type { Draft } from "./draft";

export interface BusinessHit { id: string; name: string; kind: string; place: string }

export interface StepProps {
  refData: RefData;
  draft: Draft;
  set: (patch: Partial<Draft>) => void;
  next: () => void;
  back: () => void;
}

export function StepForm({ title, am, onSubmit, back, children, nextLabel = "Next" }: {
  title: string; am: string; onSubmit: () => void; back?: () => void; children: ReactNode; nextLabel?: string;
}) {
  return (
    <form className="card form-card" onSubmit={e => { e.preventDefault(); onSubmit(); }}>
      <h2>{title}<Am text={am} /></h2>
      {children}
      <div className="form-foot">
        {back ? <button className="btn btn--secondary" type="button" onClick={back}>Back</button> : <span />}
        <button className="btn btn--stack" type="submit"><span>{nextLabel}</span><Am text="ቀጣይ" /></button>
      </div>
    </form>
  );
}

export function Step1({ draft, set, next, refData }: StepProps) {
  const options = refData.categories.map(c => ({ value: c.code, title: c.nameEn, text: CATEGORY_TEXT[c.code as keyof typeof CATEGORY_TEXT]?.text }));
  return (
    <StepForm title="What happened?" am="ምን ሆነ?" onSubmit={next}>
      <ChoiceGroup name="category" dropdown placeholder="Choose the kind of problem" legend="What kind of problem is it?" options={options}
        value={draft.category} onChange={v => set({ category: v as Draft["category"] })} />
      <TextField id="c-subject" label="A short title" required maxLength={120} value={draft.subject} onChange={e => set({ subject: e.target.value })}
        hint={'For example: "Kettle stopped working after three days".'} invalid="Write a short title." />
      <TextAreaField id="c-what" label="Tell us what happened" am="ዝርዝር" required minLength={20} maxLength={3000} value={draft.what}
        onChange={e => set({ what: e.target.value })} invalid="Tell us what happened in at least a few words (20 characters)." />
      <CheckField checked={draft.urgent} onChange={e => set({ urgent: e.target.checked })}>
        <b>This product could harm someone&apos;s health or safety.</b> <span className="muted">An officer looks at these first.</span></CheckField>
    </StepForm>
  );
}

export function Step2({ draft, set, next, back, refData }: StepProps) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<BusinessHit[]>([]);
  const [busy, setBusy] = useState(false);
  const b = draft.business;
  // keep the chosen business visible even when a new search no longer returns it
  const shown = b.mode === "registered" && !hits.some(h => h.id === b.id) ? [{ id: b.id, name: b.name, kind: "Selected", place: b.place }, ...hits] : hits;
  const patch = (p: Partial<Draft["business"]>) => set({ business: { ...b, ...p } });

  useEffect(() => {
    let live = true;
    setBusy(true);
    const t = setTimeout(() => apiGet<BusinessHit[]>(`/api/reference/businesses?q=${encodeURIComponent(q)}`).then(r => { if (live) { setHits(r.ok ? r.data : []); setBusy(false); } }), 250);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  return (
    <StepForm title="Which business?" am="የትኛው ድርጅት?" onSubmit={next} back={back}>
      <p>If the business is registered on AddisB2B, choose it from the list. Otherwise tell us its name and where it is.</p>
      <div className="field"><label htmlFor="biz-q"><Icon name="search" /> Search by name, market or street</label>
        <input id="biz-q" className="input" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="For example: Gebriel" /></div>
      <fieldset className="field">
        <legend className="label" aria-live="polite">{busy ? "Searching…" : `Businesses found (${hits.length} on AddisB2B)`}</legend>
        <div className="choice-grid choice-grid--1">
          {shown.map(h => (
            <label className="choice" key={h.id}>
              <input type="radio" name="business" required checked={b.id === h.id} onChange={() => patch({ mode: "registered", id: h.id, name: h.name, place: h.place })} />
              <span><b>{h.name} <span className="badge badge--green">On AddisB2B</span></b><small>{h.kind} · {h.place}</small></span>
            </label>
          ))}
          <label className="choice">
            <input type="radio" name="business" required checked={b.mode === "other"} onChange={() => patch({ mode: "other", id: "", name: b.mode === "other" ? b.name : "" })} />
            <span><b>The business is not on this list</b><small>Small shops, street sellers, online sellers and service providers</small></span>
          </label>
        </div>
      </fieldset>
      {b.mode === "other" && (
        <div className="form-grid">
          <TextField id="biz-name" label="Name of the business or seller" full required maxLength={120} value={b.name} onChange={e => patch({ name: e.target.value })}
            placeholder="For example: Kality Mini Market" invalid="Write the name of the business or seller." />
          <ComboField id="biz-sub" label="Sub-City" options={refData.subcities.map(s => s.name)} placeholder="Choose or type a Sub-City" value={b.subcity} onChange={v => patch({ subcity: v, woreda: "" })} />
          <ComboField id="biz-wo" label="Woreda (if known)" optional options={woredaOptions(refData, b.subcity)} placeholder={b.subcity ? "Choose or type a Woreda" : "Choose a Sub-City first"} disabled={!b.subcity} value={b.woreda} onChange={v => patch({ woreda: v })} />
          <TextField id="biz-addr" label="Street, building or landmark" full value={b.address} onChange={e => patch({ address: e.target.value })} />
          <TextField id="biz-phone" label="Phone of the business (if known)" optional type="tel" full value={b.phone} onChange={e => patch({ phone: e.target.value })} />
        </div>
      )}
      <div className="alert"><Icon name="shield" /><div><strong>The business will not see who you are.</strong>
        <p className="mb-0">It gets a case number and the facts it needs to reply. You see exactly what it gets in the last step.</p></div></div>
    </StepForm>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

export function Step3({ draft, set, next, back, refData }: StepProps) {
  const p = draft.purchase;
  const patch = (x: Partial<Draft["purchase"]>) => set({ purchase: { ...p, ...x } });
  return (
    <StepForm title="Your purchase" am="የገዙት ዕቃ ወይም አገልግሎት" onSubmit={next} back={back}>
      <div className="form-grid">
        <TextField id="p-item" label="What did you buy?" full required maxLength={160} value={p.item} onChange={e => patch({ item: e.target.value })} invalid="Tell us what you bought." />
        <TextField id="p-date" label="Date of purchase" type="date" required max={today()} value={p.date} onChange={e => patch({ date: e.target.value })}
          invalid="Choose a date that is not in the future." />
        <div className="full"><ChoiceGroup name="where" legend="Where did you buy it?" value={p.where} onChange={v => patch({ where: v })} options={[
          { value: "market", title: "At a Sunday Market or Market Center" }, { value: "shop", title: "In a shop" }, { value: "online", title: "Online or by phone" }]} /></div>
        <ComboField id="p-sub" label="Sub-City" required options={refData.subcities.map(s => s.name)} placeholder="Choose or type a Sub-City" value={p.subcity} onChange={v => patch({ subcity: v, woreda: "" })}
          hint="Start typing to see suggestions. You can send the complaint to this Sub-City or Woreda office in the last step." invalid="Choose a Sub-City from the list." />
        <ComboField id="p-wo" label="Woreda" required options={woredaOptions(refData, p.subcity)} placeholder={p.subcity ? "Choose or type a Woreda" : "Choose a Sub-City first"} disabled={!p.subcity} value={p.woreda} onChange={v => patch({ woreda: v })} invalid="Choose the Woreda from the list." />
        <TextField id="p-place" label="Market, shop address or website" full value={p.place} onChange={e => patch({ place: e.target.value })} />
        <TextField id="p-paid" label="Amount you paid (ETB)" type="number" min={0} inputMode="decimal" required value={p.paid} onChange={e => patch({ paid: e.target.value })}
          invalid="Write the amount, or 0 if you paid nothing." />
        <TextField id="p-loss" label="Your loss (ETB)" optional type="number" min={0} inputMode="decimal" value={p.loss} onChange={e => patch({ loss: e.target.value })}
          hint="For example 4 kg short at 90 ETB a kilo." />
      </div>
      <ChoiceGroup name="receipt" legend="Did you get a receipt?" required={false} value={p.receipt} onChange={v => patch({ receipt: v })}
        options={[{ value: "yes", title: "Yes" }, { value: "no", title: "No" }, { value: "lost", title: "I lost it" }]} />
    </StepForm>
  );
}

/** Woreda numbers of one Sub-City, as the strings a select shows. */
export const woredasOf = (ref: RefData, subcityName: string): string[] =>
  (ref.subcities.find(x => x.name === subcityName)?.woredas ?? []).map(w => String(w.number));

/** The Woredas of one Sub-City as dropdown options ("Woreda 7"). */
export const woredaOptions = (ref: RefData, subcityName: string) => woredasOf(ref, subcityName).map(n => ({ value: n, label: `Woreda ${n}` }));
