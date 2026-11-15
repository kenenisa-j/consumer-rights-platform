"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiPost } from "@/lib/api";
import type { RefData } from "@/lib/reference";
import { saveHandoff } from "@/lib/handoff";
import { Alert } from "@/components/ui/Display";
import { ChoiceGroup, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { Am } from "@/components/ui/Bi";
import { CloseOrLink } from "@/components/ui/RouteModal";

const KINDS = ["Prices above the official list", "Goods hidden or held back", "Expired or unsafe goods on sale",
  "False scales or short weight", "Misleading advertising", "Something else"].map(v => ({ value: v, title: v }));

const today = () => new Date().toISOString().slice(0, 10);

export function TipForm({ subcities }: { subcities: RefData["subcities"] }) {
  const router = useRouter();
  const [sub, setSub] = useState("");
  const [who, setWho] = useState<"anon" | "contact">("anon");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "");
    setBusy(true); setFailed(null);
    const res = await apiPost<{ reference: string; code: string; receivedAt: string; anonymous: boolean }>("/api/tips", {
      kind: v("kind"), subcity: subcities.find(s => s.name === v("subcity"))?.code, woreda: v("woreda") || null, place: v("place"),
      business: v("business"), product: v("product"), when: v("when"), text: v("text"), anonymous: who === "anon", name: v("name"), phone: v("phone")
    });
    if (!res.ok) { setFailed(res.error); setBusy(false); return; }
    saveHandoff("tip-receipt", res.data); // the private code is shown once, on the next screen
    router.push("/tip/sent");
  };

  return (
    <form className="card form-card" onSubmit={submit}>
      {failed && <div className="field-error-summary"><Alert tone="bad" icon="flag" role="alert" title="Your tip was not sent.">{failed} Your answers are still here.</Alert></div>}
      <ChoiceGroup name="kind" dropdown placeholder="Choose what you saw" legend="What did you see?" options={KINDS} value={KINDS[0].value} />
      <div className="form-grid">
        <SelectField id="t-sub" name="subcity" label="Sub-City" required options={subcities.map(s => s.name)} placeholder="Choose a Sub-City" value={sub} onChange={e => setSub(e.target.value)} invalid="Choose a Sub-City." />
        <SelectField id="t-wo" name="woreda" label="Woreda (if known)" optional key={sub} options={(subcities.find(s => s.name === sub)?.woredas ?? []).map(w => String(w.number))}
          placeholder={sub ? "Choose a Woreda" : "Choose a Sub-City first"} disabled={!sub} />
        <TextField id="t-place" name="place" label="Market, street or landmark" full required maxLength={160}
          hint="Tell us where, so an officer can go and check." invalid="Tell us where." />
        <TextField id="t-biz" name="business" label="Business name (if known)" optional maxLength={120} />
        <TextField id="t-prod" name="product" label="Product (if any)" optional maxLength={120} />
        <TextField id="t-when" name="when" label="When did you see it?" type="date" max={today()} required invalid="Choose a date that is not in the future." />
      </div>
      <TextAreaField id="t-text" name="text" label="Describe it" required minLength={10} maxLength={2000}
        invalid="Describe what you saw in a few words." placeholder="Example: Several shops near the market sell sugar at 160 ETB a kilo. The price list says 125." />

      <fieldset className="field">
        <legend className="label">Your identity</legend>
        <div className="choice-grid choice-grid--1">
          <label className="choice"><input type="radio" name="who" checked={who === "anon"} onChange={() => setWho("anon")} />
            <span><b>Stay anonymous</b><small>We keep no name, phone or email. You get a private code to check your tip.</small></span></label>
          <label className="choice"><input type="radio" name="who" checked={who === "contact"} onChange={() => setWho("contact")} />
            <span><b>Share my contact details with the officer</b><small>Only the officer sees them, to ask you questions. They are never given to a business.</small></span></label>
        </div>
        {who === "contact" && (
          <div className="form-grid mt-4">
            <TextField id="t-name" name="name" label="Name" required maxLength={100} invalid="Write your name." />
            <TextField id="t-phone" name="phone" label="Phone" type="tel" required inputMode="tel" invalid="Write a phone number." />
          </div>
        )}
      </fieldset>

      <div className="form-foot">
        <CloseOrLink className="btn btn--secondary" href="/">Cancel</CloseOrLink>
        <button className="btn btn--stack" type="submit" disabled={busy}><span>{busy ? "Sending…" : "Send the tip"}</span><Am text="ጥቆማውን ላክ" /></button>
      </div>
    </form>
  );
}
