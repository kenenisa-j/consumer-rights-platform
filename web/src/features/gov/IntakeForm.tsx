"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { SUB_CITIES } from "@/content/common";
import { submitIntake } from "@/mocks/misc";
import type { GovLevel } from "@/types/gov";
import { Alert, CallBox } from "@/components/ui/Display";
import { CheckField, ChoiceGroup, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { Am } from "@/components/ui/Bi";
import { LEVELS } from "./levels";

const PHONE = String.raw`(\+251 ?|0)[79]( ?[0-9]){8}`;
const CATEGORIES = ["Expired products", "Defective or substandard goods", "Wrong weight or measure", "Price above the official ceiling", "Service complaint", "Other"];
const SOURCES: Record<GovLevel, string[]> = {
  woreda: ["In person", "Phone", "Letter"], subcity: ["In person", "Phone", "Letter"], bureau: ["In person", "Free call 8070", "Letter"]
};
const INTRO: Record<GovLevel, string> = {
  woreda: "Record a complaint that did not come through the website. It goes to the business first if the business is on AddisB2B. Otherwise it stays with your Woreda.",
  subcity: "Record a complaint that did not come through the website. It goes to the business first if the business is on AddisB2B. Otherwise it goes to the Woreda where the consumer bought.",
  bureau: "Record a complaint that did not come through the website. It goes to the business first if the business is on AddisB2B. Otherwise it goes to the Woreda where the consumer bought."
};

interface Saved { reference: string; to: string }

/** Staff record a complaint taken by phone, in person or by letter. The consumer is told the number by message. */
export function IntakeForm({ level, freeCall }: { level: GovLevel; freeCall: string }) {
  const [registered, setRegistered] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [busy, setBusy] = useState(false);
  const cfg = LEVELS[level];

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);
    setBusy(true);
    const business = String(d.get("business") || "").trim();
    const category = String(d.get("category") || "OTHER");
    const payload = {
      route: registered ? "REGISTERED_BUSINESS" : "DIRECT_GOVERNMENT",
      categoryId: category === "Other" ? "OTHER" : category,
      incidentDate: new Date().toISOString(),
      itemDescription: String(d.get("description") || "In-person/phone complaint"),
      disputedAmount: Number(d.get("amount")) || 0,
      currency: "ETB",
      desiredRemedy: "Resolution",
      receiptAvailable: false,
      unregisteredMerchantName: business,
      unregisteredMerchantLocation: String(d.get("where") || ""),
    };
    const { reference } = await submitIntake(payload);
    const to = registered ? `${business} is on AddisB2B, so the complaint went to the business first.`
      : level === "woreda" ? `${business} is not on AddisB2B, so the complaint went straight to ${cfg.office}.`
      : `${business} is not on AddisB2B, so the complaint went straight to Woreda ${d.get("woreda")}, ${d.get("subcity")}.`;
    setSaved({ reference, to }); setBusy(false); form.reset(); setRegistered(false);
  };

  if (saved) {
    return (
      <div className="stack">
        <div className="ws-title"><div><h1>Complaint saved<Am text="ቅሬታው ተመዝግቧል" /></h1></div></div>
        <Alert tone="ok" icon="check" role="status" title={`The complaint was recorded as ${saved.reference}.`}>
          <p className="mb-0">The consumer was sent the number by message. {saved.to}</p></Alert>
        <div className="card center"><p>Give the consumer this number to quote.</p><p><span className="ref">{saved.reference}</span></p></div>
        <div className="btn-row">
          <Link className="btn" href={`/${level}/cases`}>Go to the cases</Link>
          <button className="btn btn--secondary" type="button" onClick={() => setSaved(null)}>Record another</button>
        </div>
        <CallBox freeCall={freeCall} text="Questions? Call free." />
      </div>
    );
  }

  return (
    <>
      <div className="ws-title"><div><h1>New complaint<Am text="አዲስ ቅሬታ" /></h1><p>{INTRO[level]}</p></div></div>
      <form className="card form-card stack" onSubmit={submit}>
        <ChoiceGroup name="source" legend="How did it arrive?" options={SOURCES[level].map(v => ({ value: v, title: v }))} />
        <h2 style={{ fontSize: "1.1rem" }}>The consumer (an individual)</h2>
        <div className="form-grid">
          <TextField id="in-name" name="name" label="Full name" required minLength={3} maxLength={100} invalid="Write the full name." />
          <TextField id="in-phone" name="phone" label="Phone" type="tel" required pattern={PHONE} inputMode="tel" invalid="Write a mobile number such as 0911 234 567." />
          <SelectField id="in-sub" name="subcity" label="Sub-City" required options={SUB_CITIES} placeholder="Choose a Sub-City" invalid="Choose a Sub-City." />
          <TextField id="in-wo" name="woreda" label="Woreda" type="number" min={1} max={30} inputMode="numeric" required invalid="Write the Woreda number." />
        </div>
        <h2 style={{ fontSize: "1.1rem" }}>The business</h2>
        <div className="form-grid">
          <TextField id="in-biz" name="business" label="Business name" required maxLength={120} invalid="Write the business name." />
          <TextField id="in-where" name="where" label="Where" maxLength={160} />
        </div>
        <CheckField checked={registered} onChange={e => setRegistered(e.target.checked)}>The business is on AddisB2B (it gets the complaint first)</CheckField>
        <h2 style={{ fontSize: "1.1rem" }}>The problem</h2>
        <div className="form-grid">
          <SelectField id="in-cat" name="category" label="Category" required options={CATEGORIES} placeholder="Choose a category" invalid="Choose a category." />
          <TextField id="in-amount" name="amount" label="Amount paid (ETB)" optional type="number" min={0} inputMode="decimal" />
        </div>
        <TextAreaField id="in-desc" name="description" label="What happened" required minLength={10} maxLength={2000} invalid="Write what happened (at least 10 characters)." />
        <CheckField name="urgent">Urgent: a risk to health or safety</CheckField>
        <div className="form-foot">
          <Link className="btn btn--secondary" href={`/${level}/dashboard`}>Back</Link>
          <button className="btn btn--accent" type="submit" disabled={busy}>{busy ? "Saving…" : "Save the complaint"}</button>
        </div>
      </form>
    </>
  );
}
