"use client";

import { useState, type FormEvent } from "react";
import { CheckField, ChoiceGroup, TextAreaField, TextField } from "@/components/ui/Field";
import { FilePicker, useFilePicker } from "@/components/ui/FileList";
import { Am } from "@/components/ui/Bi";
import type { BizAction } from "./biz-case-state";

type Reply = Extract<BizAction, { type: "reply" }>;

/** The business's first reply: explanation, position, and an offer. Documents are optional. */
export function BizReplyForm({ onReply }: { onReply: (a: Reply) => void }) {
  const [offer, setOffer] = useState("");
  const picker = useFilePicker(8, 10);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const s = (k: string) => String(d.get(k) ?? "").trim();
    onReply({ type: "reply", explanation: s("explanation"), position: s("position"), offer: s("offer"), amount: s("amount"),
      detail: offer === "replacement" ? s("replacement") : s("other") });
  };

  return (
    <form className="card form-card" onSubmit={submit}>
      <h2>Reply to the consumer<Am text="ምላሽ ይስጡ" /></h2>
      <TextAreaField id="rp-explanation" name="explanation" label="What happened, in your words" required minLength={20} maxLength={2000}
        placeholder="Explain what you know about this sale." invalid="Write at least 20 characters." />
      <ChoiceGroup name="position" legend="Do you accept the complaint?" columns={1} options={[
        { value: "accept", title: "Yes, I accept it", text: "We want to put this right." }, { value: "part", title: "In part", text: "Some of it is correct." },
        { value: "dispute", title: "No, I dispute it", text: "Explain why above and add your documents." }]} />
      <ChoiceGroup name="offer" legend="What do you offer the consumer?" value={offer} onChange={setOffer} options={[
        { value: "refund", title: "A refund" }, { value: "replacement", title: "A replacement" }, { value: "other", title: "Something else" }]} />
      {offer === "refund" && <TextField id="rp-amount" name="amount" label="Refund amount (ETB)" type="number" min={1} inputMode="decimal" required style={{ maxWidth: 240 }} invalid="Write the refund amount." />}
      {offer === "replacement" && <TextField id="rp-replacement" name="replacement" label="What will you replace it with?" required maxLength={200} invalid="Say what you will replace it with." />}
      {offer === "other" && <TextAreaField id="rp-other" name="other" label="Describe your offer" required minLength={10} maxLength={600} invalid="Describe your offer." />}
      <FilePicker id="rp-files" picker={picker} note="JPG, PNG or PDF · up to 10 MB each · up to 8 files" />
      <CheckField name="confirm" required>What I have written is true and complete.</CheckField>
      <div className="alert mt-4"><div><strong>Who sees your reply</strong>
        <p className="mb-0">The consumer sees your reply and your offer, but never your personal details. You do not see theirs. If you cannot agree, the consumer can move it to the Woreda.</p></div></div>
      <div className="form-foot"><span /><button className="btn btn--stack" type="submit"><span>Send my reply</span><Am text="ምላሽ ላክ" /></button></div>
    </form>
  );
}
