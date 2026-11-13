"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FileDrop } from "@/components/ui/Field";

const MAX = 5 * 1024 * 1024;
type How = "upload" | "later";

export function VerifyForm() {
  const router = useRouter();
  const [how, setHow] = useState<How>("upload");
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<File | null>(null);

  const onFile = (file: File | undefined) => {
    setPicked(null);
    if (!file) return setError(null);
    if (file.size > MAX) return setError("The file is larger than 5 MB. Choose a smaller photo.");
    setError(null); setPicked(file);
  };
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (how === "upload" && !picked) return setError("Choose a photo or PDF of your ID, or choose “Do it later”.");
    router.push("/my-cases");
  };

  return (
    <form className="card form-card" onSubmit={submit}>
      <fieldset className="field">
        <legend className="label">How do you want to confirm?</legend>
        <div className="choice-grid choice-grid--1">
          <label className="choice"><input type="radio" name="how" checked={how === "upload"} onChange={() => { setHow("upload"); setError(null); }} />
            <span><b>Upload a photo of your ID</b><small>Kebele ID, passport or driving licence. An officer checks it, usually within one working day.</small></span></label>
          <label className="choice choice--disabled"><input type="radio" name="how" disabled />
            <span><b>Verify with Fayda National ID <span className="badge badge--later">Later phase</span></b><small>Needs approval and access from the Fayda programme.</small></span></label>
          <label className="choice"><input type="radio" name="how" checked={how === "later"} onChange={() => { setHow("later"); setError(null); }} />
            <span><b>Do it later</b><small>You can still make a complaint. The officer may ask for your ID before a refund.</small></span></label>
        </div>
      </fieldset>
      {how === "upload" && (
        <div className="field"><span className="label">Photo of your ID</span>
          <FileDrop id="v-file" title={picked ? picked.name : "Choose a photo or PDF"} note="JPG, PNG or PDF, up to 5 MB"
            onChange={e => onFile(e.target.files?.[0])} />
          <p className="small muted">Only consumer protection officers can open it. It is never shared with a business.</p>
        </div>
      )}
      {error && <p className="error-text show" role="alert">{error}</p>}
      <div className="form-foot">
        <Link className="btn btn--secondary" href="/my-cases">Skip for now</Link>
        <button className="btn" type="submit">{how === "upload" ? "Send for checking" : "Continue"}</button>
      </div>
    </form>
  );
}
