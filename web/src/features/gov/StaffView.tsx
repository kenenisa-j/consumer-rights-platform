"use client";

import { useState, type FormEvent } from "react";
import type { GovLevel } from "@/types/gov";
import { STAFF, STAFF_ALLOWED, STAFF_INTRO } from "@/mocks/gov-admin";
import { Alert, StatusPill } from "@/components/ui/Display";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField, TextField } from "@/components/ui/Field";
import { savePerson, type Person, type PersonStatus } from "./admin-state";

const STATUSES: PersonStatus[] = ["Active", "On leave", "Left the office"];

/** Staff and roles for one level. What can be given (roles, offices) is limited to what the level manages. */
export function StaffView({ level }: { level: GovLevel }) {
  const [people, setPeople] = useState<Person[]>(STAFF[level]);
  const [editing, setEditing] = useState<Person | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const allowed = STAFF_ALLOWED[level];

  const active = people.filter(x => x.status === "Active");
  const perOfficer = active.length ? Math.round(active.reduce((n, x) => n + x.cases, 0) / active.length) : 0;
  const close = () => { setEditing(null); setError(null); };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const s = (k: string) => String(d.get(k) ?? "");
    const r = savePerson(people, { name: s("name"), email: s("email"), role: s("role"), office: s("office"), status: s("status") as PersonStatus }, allowed,
      editing && editing !== "new" ? editing.id : undefined);
    if (!r.ok) { setError(r.notice); return; }
    setPeople(r.list); setNotice(r.notice); close();
  };
  const current = editing && editing !== "new" ? editing : undefined;

  return (
    <>
      <div className="ws-title"><div><h1>Staff and roles</h1><p>{STAFF_INTRO[level]}</p></div>
        <button className="btn btn--accent" type="button" onClick={() => setEditing("new")}>Add a person</button></div>
      <div className="stack">
        {notice && <Alert tone="ok" icon="check" role="status" title={notice} />}
        {level !== "bureau" && (
          <div className="tiles">
            <div className="tile"><b>{people.length}</b><span>People</span></div><div className="tile"><b>{active.length}</b><span>Active</span></div>
            <div className="tile"><b>{people.filter(x => x.status === "On leave").length}</b><span>On leave</span></div><div className="tile"><b>{perOfficer}</b><span>Open cases per officer</span></div>
          </div>
        )}
        <div className="table-wrap"><table className="table table--stack">
          <caption className="visually-hidden">Staff</caption>
          <thead><tr><th scope="col">Name</th><th scope="col">Role</th><th scope="col">Office</th><th scope="col">Status</th><th scope="col"><span className="visually-hidden">Action</span></th></tr></thead>
          <tbody>{people.map(x => (
            <tr key={x.id}><td><b>{x.name}</b><small>{x.email}</small></td><td data-label="Role">{x.role}</td><td data-label="Office">{x.office}</td>
              <td data-label="Status"><StatusPill tone={x.status === "Active" ? "ok" : x.status === "On leave" ? "warn" : "grey"}>{x.status}</StatusPill></td>
              <td className="num"><button className="btn btn--secondary btn--sm" type="button" onClick={() => { setError(null); setEditing(x); }}>Edit<span className="visually-hidden"> {x.name}</span></button></td></tr>))}</tbody>
        </table></div>
      </div>

      <Dialog open={!!editing} onClose={close} title={current ? "Edit a person" : "Add a person"}>
        {error && <div className="field-error-summary"><Alert tone="bad" icon="flag" role="alert" title={error} /></div>}
        <form onSubmit={submit}>
          <TextField id="st-name" name="name" label="Full name" required minLength={3} maxLength={100} defaultValue={current?.name} invalid="Write the full name." />
          <TextField id="st-email" name="email" label="Work email" type="email" required defaultValue={current?.email} invalid="Write a valid work email." />
          <SelectField id="st-role" name="role" label="Role" required options={allowed.roles} defaultValue={current?.role} />
          <SelectField id="st-office" name="office" label="Office" required options={allowed.offices} defaultValue={current?.office} />
          <SelectField id="st-status" name="status" label="Status" required options={STATUSES} defaultValue={current?.status ?? "Active"} />
          <p className="small muted">{level === "bureau" ? "The role decides which portal the person signs in to: Woreda, Sub-City or City Bureau." : STAFF_INTRO[level]}</p>
          <div className="btn-row"><button className="btn" type="submit">Save</button><button className="btn btn--secondary" type="button" onClick={close}>Cancel</button></div>
        </form>
      </Dialog>
    </>
  );
}
