"use client";

import { useState, type FormEvent } from "react";
import type { GovLevel } from "@/types/gov";
import { CITY_SETTINGS, SETTINGS, URGENT_OFFICERS } from "@/mocks/gov-admin";
import { Alert, KeyValue } from "@/components/ui/Display";
import { CheckField, ChoiceGroup, SelectField, TextField } from "@/components/ui/Field";
import { LEVELS } from "./levels";

// The free call number is a setting the public pages read at run time (FREE_CALL_NUMBER today). Digits only.
const NUMBER = "[0-9]{3,10}";
const num = (d: FormData, k: string) => Number(d.get(k));

function CityForm() {
  const [saved, setSaved] = useState(false);
  const s = CITY_SETTINGS;
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); setSaved(true); };
  return (
    <form className="card form-card stack" onSubmit={submit} onChange={() => setSaved(false)}>
      <h2 style={{ fontSize: "1.1rem" }}>Free call line</h2>
      <div className="form-grid">
        <TextField id="cs-number" name="number" label="Number" required pattern={NUMBER} inputMode="numeric" defaultValue={s.number} hint="Shown on every public page." invalid="Write the number with digits only (3 to 10)." />
        <TextField id="cs-hours" name="hours" label="Open" required maxLength={80} defaultValue={s.hours} invalid="Write the opening hours." />
      </div>
      <h2 style={{ fontSize: "1.1rem" }}>Time limits</h2>
      <div className="form-grid">
        <TextField id="cs-reply" name="reply" label="The business replies within (hours)" type="number" min={1} max={720} required defaultValue={s.reply} invalid="Write a number of hours (1 to 720)." />
        <TextField id="cs-review" name="review" label="The Bureau reviews within (working days)" type="number" min={1} max={60} required defaultValue={s.review} invalid="Write a number of working days (1 to 60)." />
      </div>
      <h2 style={{ fontSize: "1.1rem" }}>Time at each level (working days)</h2>
      <div className="form-grid">
        <TextField id="cs-woreda" name="woreda" label="Woreda" type="number" min={1} max={60} required defaultValue={s.woreda} invalid="Write the working days." />
        <TextField id="cs-subcity" name="subcity" label="Sub-City" type="number" min={1} max={60} required defaultValue={s.subcity} invalid="Write the working days." />
        <TextField id="cs-bureau" name="bureau" label="City Bureau" type="number" min={1} max={60} required defaultValue={s.bureau} invalid="Write the working days." />
      </div>
      <p className="small muted mb-0">These time limits are <span className="badge badge--proposed">Proposed</span> until the Bureau approves them (open questions 6 and 18).</p>
      <div className="form-foot"><span role="status" className="small">{saved ? "Settings saved." : ""}</span><button className="btn" type="submit">Save settings</button></div>
    </form>
  );
}

function OfficeForm({ level }: { level: "woreda" | "subcity" }) {
  const cfg = LEVELS[level];
  const initial = SETTINGS[level];
  const [saved, setSaved] = useState(false);
  const [assign, setAssign] = useState(initial.assign);
  return (
    <div className="stack">
      <form className="card form-card stack" onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); setSaved(true); }} onChange={() => setSaved(false)}>
        <ChoiceGroup name="assign" legend="When a case reaches your office" value={assign} onChange={setAssign} columns={1} options={[
          { value: "fewest", title: "Give it to the officer with the fewest open cases" }, { value: "me", title: `Give it to me (${cfg.person.name})` },
          { value: "none", title: "Leave it unassigned until someone takes it" }]} />
        <SelectField id="os-urgent" name="urgent" label="Officer for urgent cases" options={URGENT_OFFICERS[level]} defaultValue={initial.urgent} />
        {level === "subcity" && <SelectField id="os-tips" name="tips" label="Tips with no clear Woreda go to" options={["Keep at the Sub-City", "Woreda 7", "Woreda 5"]} defaultValue={initial.tips} />}
        <fieldset className="field"><legend className="label">Tell me by email when</legend>
          <CheckField name="n1" defaultChecked={initial.n1}>A case reaches my office</CheckField>
          <CheckField name="n2" defaultChecked={initial.n2}>A consumer or a business writes in Messages</CheckField>
          <CheckField name="n3" defaultChecked={initial.n3}>A case is close to its time limit</CheckField></fieldset>
        <div className="form-foot"><span role="status" className="small">{saved ? "Settings saved." : ""}</span><button className="btn" type="submit">Save settings</button></div>
      </form>
      <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}>Set by the City Bureau</h2>
        <KeyValue rows={[["Time limit", `5 working days at the ${cfg.levelName}`], ["Free call line", "8070, Monday to Friday, 8:30 to 17:30"], ["Categories", "The same for the whole city"]]} />
        <p className="small mb-0 mt-4">Office address, phone and opening hours are in Offices.</p></div>
    </div>
  );
}

/** Settings of one level. Office levels choose how cases are assigned; the City Bureau sets the number and time limits. */
export function SettingsView({ level }: { level: GovLevel }) {
  return (
    <>
      <div className="ws-title"><div><h1>Settings</h1><p>{level === "bureau" ? "Free call line and time limits" : "How your office works in the portal"}</p></div></div>
      {level === "bureau" ? <CityForm /> : <OfficeForm level={level} />}
      <Alert icon="clock" title="Demo settings">Changes are kept only while this page is open. The backend will store them and apply them to new cases.</Alert>
    </>
  );
}
