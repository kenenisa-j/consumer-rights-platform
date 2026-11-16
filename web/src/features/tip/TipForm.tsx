"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SUB_CITIES } from "@/content/common";
import { submitTip } from "@/mocks/misc";
import { saveHandoff } from "@/lib/handoff";
import { Alert } from "@/components/ui/Display";
import { ChoiceGroup, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { FilePicker, useFilePicker } from "@/components/ui/FileList";
import { Am } from "@/components/ui/Bi";
import { CloseOrLink } from "@/components/ui/RouteModal";

const KINDS = ["Prices above the official list", "Goods hidden or held back", "Expired or unsafe goods on sale",
  "False scales or short weight", "Misleading advertising", "Something else"].map(v => ({ value: v, title: v }));

const today = () => new Date().toISOString().slice(0, 10);

export function TipForm() {
  const router = useRouter();
  const picker = useFilePicker(8, 10);
  const [who, setWho] = useState<"anon" | "contact">("anon");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true); setFailed(false);
    try {
      const formData = new FormData(e.currentTarget);
      const payload: any = {
        category: String(formData.get("kind") || "Something else"),
        subcity: String(formData.get("subcity") || "Bole"),
        woreda: formData.get("woreda") ? String(formData.get("woreda")) : undefined,
        marketLocation: String(formData.get("place") || ""),
        description: String(formData.get("text") || ""),
      };
      const receipt = await submitTip(payload); // backend: no identity stored when anonymous
      saveHandoff("tip-receipt", { ...receipt, anonymous: who === "anon" });
      router.push("/tip/sent");
    } catch { setFailed(true); setBusy(false); }
  };

  return (
    <form className="card form-card" onSubmit={submit}>
      {failed && <div className="field-error-summary"><Alert tone="bad" icon="flag" role="alert" title="Your tip was not sent.">Check your connection and try again. Your answers are still here.</Alert></div>}
      <ChoiceGroup name="kind" dropdown placeholder="Choose what you saw" legend="What did you see?" options={KINDS} value={KINDS[0].value} />
      <div className="form-grid">
        <SelectField id="t-sub" name="subcity" label="Sub-City" required options={SUB_CITIES} placeholder="Choose a Sub-City" invalid="Choose a Sub-City." />
        <TextField id="t-wo" name="woreda" label="Woreda (if known)" optional type="number" min={1} max={30} inputMode="numeric" />
        <TextField id="t-place" name="place" label="Market, street or landmark" full required maxLength={160}
          hint="Tell us where, so an officer can go and check." invalid="Tell us where." />
        <TextField id="t-biz" name="business" label="Business name (if known)" optional maxLength={120} />
        <TextField id="t-prod" name="product" label="Product (if any)" optional maxLength={120} />
        <TextField id="t-when" name="when" label="When did you see it?" type="date" max={today()} required invalid="Choose a date that is not in the future." />
      </div>
      <TextAreaField id="t-text" name="text" label="Describe it" required minLength={10} maxLength={2000}
        invalid="Describe what you saw in a few words." placeholder="Example: Several shops near the market sell sugar at 160 ETB a kilo. The price list says 125." />
      <FilePicker id="t-files" picker={picker} note="JPG, PNG or PDF · up to 10 MB each · up to 8 files" />
      <p className="small muted">Photos can carry the place and time they were taken. Leave them out if you want to stay fully anonymous.</p>

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
