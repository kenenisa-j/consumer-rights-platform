"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { bi } from "@/content/types";
import { Dialog } from "@/components/ui/Dialog";
import { ComboField } from "@/components/ui/ComboField";
import { TextAreaField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Display";

interface Options {
  level: "bureau" | "subcity" | "woreda";
  bureau: boolean; subcity: boolean; woreda: boolean;
  subcities: { code: string; name: string }[];
  woredaSubcities: { code: string; name: string; woredas: number[] }[];
}
type Where = "bureau" | "subcity" | "woreda";

const OWN = { bureau: "City Bureau", subcity: "Sub-City", woreda: "Woreda" } as const;

/**
 * "Send to another office": the City Bureau can send a complaint down to a Sub-City or a Woreda (or keep it), a Sub-City up to the Bureau or
 * down to a Woreda of its own, a Woreda up to its Sub-City or the Bureau. The dropdowns list only the places this officer may use; the API checks the same
 * rule again, so a changed request cannot go further. A handover note is always kept.
 */
export function RedirectCase({ reference, level }: { reference: string; level: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<Options | null>(null);
  const [where, setWhere] = useState<Where | "">("");
  const [sub, setSub] = useState("");     // Sub-City code (for a Sub-City target)
  const [wsub, setWsub] = useState("");   // Sub-City code (for a Woreda target)
  const [wo, setWo] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || opts) return;
    void apiGet<Options>("/api/office/redirect-options").then(r => { if (r.ok) setOpts(r.data); else setError(r.error); });
  }, [open, opts]);

  const subNames = (opts?.subcities ?? []).map(s => ({ value: s.code, label: s.name }));
  const wsubNames = (opts?.woredaSubcities ?? []).map(s => ({ value: s.code, label: s.name }));
  const woredas = (opts?.woredaSubcities.find(s => s.code === wsub)?.woredas ?? []).map(n => ({ value: String(n), label: `Woreda ${n}` }));
  // A Sub-City officer has exactly one Sub-City to pick from for a Woreda: choose it for them.
  // A Woreda officer has one Sub-City above them: it is chosen for them.
  useEffect(() => { if (opts?.level === "woreda" && !sub && opts.subcities[0]) setSub(opts.subcities[0].code); }, [opts, sub]);
  useEffect(() => { if (where === "woreda" && opts?.woredaSubcities.length === 1 && !wsub) setWsub(opts.woredaSubcities[0].code); }, [where, opts, wsub]);

  const choices: { key: Where; title: string; text: string; on: boolean }[] = opts ? [
    { key: "bureau", title: "City Bureau", text: "The final level. It can settle the case or refer it on.", on: opts.bureau },
    { key: "subcity", title: opts.level === "woreda" ? "Your Sub-City office" : "A Sub-City office", text: opts.level === "bureau" ? "Choose the Sub-City that should resolve it." : "The Sub-City trade office above your Woreda.", on: opts.subcity },
    { key: "woreda", title: opts.level === "subcity" ? "A Woreda of your Sub-City" : "A Woreda office", text: opts.level === "bureau" ? "Choose the Sub-City first, then the Woreda that should resolve it on the ground." : "The Woreda office that can resolve it where it happened.", on: opts.woreda },
  ] : [];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!where) { setError("Choose where to send it."); return; }
    setBusy(true); setError(null);
    const res = await apiPost<{ handledBy: string }>(`/api/office/cases/${reference}/redirect`, {
      level: where, subcityCode: where === "subcity" ? sub : where === "woreda" ? wsub : null, woreda: where === "woreda" ? Number(wo) : null, note
    });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setOpen(false);
    router.push(`/${level}/cases?sent=${reference}&to=${encodeURIComponent(res.data.handledBy)}`);
    router.refresh();
  };

  return (
    <>
      <button className="btn btn--secondary" type="button" onClick={() => { setOpen(true); setError(null); }}>Send to another office</button>
      <Dialog open={open} onClose={() => setOpen(false)} title={bi("Send to another office", "ወደ ሌላ ቢሮ ላክ")}>
        <p className="muted">The consumer is told, and the next office sees the whole history and your note. You keep this case in your list only if your office still covers it.</p>
        <form onSubmit={submit} className="stack">
          {!opts && !error && <p role="status" className="muted">Loading the offices you can use…</p>}
          {opts && (
            <fieldset className="field dest">
              <legend className="label">Where should it go?<span className="am" lang="am">ወዴት ይላክ?</span></legend>
              <div className="choice-grid choice-grid--1">
                {choices.filter(c => c.on).map(c => (
                  <div key={c.key} className={`dest__option${where === c.key ? " is-on" : ""}`}>
                    <label className="choice">
                      <input type="radio" name="where" value={c.key} checked={where === c.key} onChange={() => setWhere(c.key)} />
                      <span><b>{c.title}</b><small>{c.text}</small></span>
                    </label>
                    {where === c.key && c.key === "subcity" && opts.level !== "woreda" && (
                      <div className="dest__pick"><ComboField id="rd-sub" label="Sub-City" required options={subNames} value={sub} onChange={setSub} placeholder="Choose or type a Sub-City" invalid="Choose the Sub-City from the list." /></div>
                    )}
                    {where === c.key && c.key === "woreda" && (
                      <div className="dest__pick dest__pick--two">
                        <ComboField id="rd-wsub" label="1. Sub-City" required options={wsubNames} value={wsub} onChange={v => { setWsub(v); setWo(""); }} placeholder="Choose or type a Sub-City" invalid="Choose the Sub-City first." />
                        <ComboField id="rd-wo" label="2. Woreda" required options={woredas} value={wo} onChange={setWo} disabled={!wsub}
                          placeholder={wsub ? "Choose or type a Woreda" : "Choose a Sub-City first"} invalid="Choose the Woreda from the list." />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </fieldset>
          )}
          <TextAreaField id="rd-note" label="Handover note" am="ማስታወሻ" required minLength={10} maxLength={1000} value={note} onChange={e => setNote(e.target.value)}
            hint="Why you are sending it, and what the next office should do. Only officers see this." invalid="Write at least a few words (10 characters)." />
          {error && <Alert tone="bad" icon="flag" role="alert" title="It was not sent.">{error}</Alert>}
          <div className="btn-row">
            <button className="btn btn--accent" type="submit" disabled={busy || !opts}>{busy ? "Sending…" : `Send${where ? ` to the ${OWN[where]}` : ""}`}</button>
            <button className="btn btn--secondary" type="button" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
