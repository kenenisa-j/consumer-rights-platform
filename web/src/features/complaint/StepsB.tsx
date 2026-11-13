"use client";

import { WANT_LABEL, needsAmount, type Draft } from "./draft";
import { CATEGORY_TEXT } from "@/content/common";
import { CheckField, ChoiceGroup, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { FilePicker, formatSize, type useFilePicker } from "@/components/ui/FileList";
import { Am } from "@/components/ui/Bi";
import { StepForm, type StepProps } from "./StepsA";

export function Step4({ draft, set, next, back, picker }: StepProps & { picker: ReturnType<typeof useFilePicker> }) {
  return (
    <StepForm title="Evidence" am="ማስረጃ" onSubmit={next} back={back}>
      <p>A receipt, photos of the goods, messages with the seller or any document that helps. You can add more later.</p>
      <FilePicker id="ev-files" picker={picker} note="JPG, PNG or PDF · up to 10 MB each · up to 8 files" withShare />
      <p className="small muted">Officers always see your files. The business sees only the ones you allow, and never your ID or contact details.</p>
      <p className="small muted mb-0">{picker.files.length === 0 ? "No files yet. You can continue without them." : null}</p>
    </StepForm>
  );
}

export function Step5({ draft, set, next, back }: StepProps) {
  const o = draft.outcome;
  const patch = (x: Partial<Draft["outcome"]>) => set({ outcome: { ...o, ...x } });
  return (
    <StepForm title="What would put it right?" am="ምን ቢደረግ ይፈታል?" onSubmit={next} back={back}>
      <ChoiceGroup name="want" legend="What do you want? (choose one)" value={o.want} onChange={v => patch({ want: v })} columns={1} options={[
        { value: "refund", title: "My money back", text: "A refund" }, { value: "replacement", title: "A replacement", text: "The same item, in good condition" },
        { value: "repair", title: "A repair", text: "Fixed at no cost to me" }, { value: "loss", title: "Payment for my loss", text: "Part of the price, or a loss I had" },
        { value: "other", title: "Something else", text: "Tell us below" }]} />
      {needsAmount(o.want) && (
        <TextField id="o-amount" label="Amount you ask for (ETB)" type="number" min={1} inputMode="decimal" required value={o.amount}
          onChange={e => patch({ amount: e.target.value })} style={{ maxWidth: 240 }} invalid="Write the amount you ask for." />
      )}
      <TextAreaField id="o-note" label="Anything else the officer should know?" optional maxLength={1000} value={o.note} onChange={e => patch({ note: e.target.value })} />
      <h3>How can the officer reach you?<Am text="በምን እናግኝዎ?" /></h3>
      <div className="form-grid">
        <TextField id="o-phone" label="Phone" type="tel" required inputMode="tel" value={o.phone} onChange={e => patch({ phone: e.target.value })} invalid="A phone number is needed." />
        <TextField id="o-email" label="Email" optional type="email" value={o.email} onChange={e => patch({ email: e.target.value })} />
        <SelectField id="o-lang" label="Language" options={["English", "Amharic · አማርኛ"]} value={o.lang} onChange={e => patch({ lang: e.target.value })} />
      </div>
      <fieldset className="field"><legend className="label">Send me updates by</legend>
        <CheckField checked disabled readOnly>This website <span className="muted">(always on)</span></CheckField>
        <CheckField checked={o.byEmail} disabled={!o.email} onChange={e => patch({ byEmail: e.target.checked })}>Email {!o.email && <span className="muted">(add an email above)</span>}</CheckField>
        <CheckField disabled>SMS <span className="badge badge--later">Later phase</span></CheckField>
      </fieldset>
    </StepForm>
  );
}

function Block({ title, step, onGo, rows }: { title: string; step: number; onGo: (n: number) => void; rows: ReadonlyArray<readonly [string, string]> }) {
  return (
    <div className="review-block">
      <div className="review-block__head"><h3>{title}</h3><button className="btn btn--ghost btn--sm" type="button" onClick={() => onGo(step)}>Change<span className="visually-hidden"> {title}</span></button></div>
      <dl className="kv">{rows.map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v || "—"}</dd></div>)}</dl>
    </div>
  );
}

export function Step6({ draft, set, back, onGo, onSend, busy, error, fileCount }: StepProps & {
  onGo: (n: number) => void; onSend: () => void; busy: boolean; error: string | null; fileCount: number;
}) {
  const { business: b, purchase: p, outcome: o } = draft;
  const money = (v: string) => (v ? `${Number(v).toLocaleString("en")} ETB` : "");
  return (
    <form className="card form-card" onSubmit={e => { e.preventDefault(); onSend(); }}>
      <h2>Check and send<Am text="ያረጋግጡና ይላኩ" /></h2>
      <p>{b.mode === "registered"
        ? <>This complaint goes first to <b>{b.name}</b>, which is on AddisB2B. If you cannot agree, you can move it to the Woreda trade office.</>
        : <>This business is not on AddisB2B, so your complaint goes straight to the Woreda trade office.</>}</p>
      <Block title="What happened" step={1} onGo={onGo} rows={[["Problem", draft.category ? CATEGORY_TEXT[draft.category].title : ""], ["Title", draft.subject],
        ["Details", draft.what.length > 160 ? `${draft.what.slice(0, 160)}…` : draft.what], ["Health or safety risk", draft.urgent ? "Yes" : "No"]]} />
      <Block title="The business" step={2} onGo={onGo} rows={[["Business", b.mode === "registered" ? `${b.name} (on AddisB2B)` : b.name], ["Where", b.mode === "registered" ? b.place : [b.address, b.subcity].filter(Boolean).join(" · ")]]} />
      <Block title="Your purchase" step={3} onGo={onGo} rows={[["Item", p.item], ["Date", p.date], ["Place", [p.place, p.subcity, p.woreda && `Woreda ${p.woreda}`].filter(Boolean).join(" · ")],
        ["Paid", money(p.paid)], ["Loss", money(p.loss)], ["Receipt", { yes: "Yes", no: "No", lost: "Lost it", "": "" }[p.receipt] ?? ""]]} />
      <Block title="Evidence" step={4} onGo={onGo} rows={[["Files", fileCount ? draft.fileNames.map(f => `${f.name} (${formatSize(f.size)}${f.shared ? ", shown to the business" : ", officers only"})`).join("; ") : "None added"]]} />
      <Block title="What you want" step={5} onGo={onGo} rows={[["Outcome", `${WANT_LABEL[o.want] ?? ""}${needsAmount(o.want) && o.amount ? `: ${money(o.amount)}` : ""}`], ["Note", o.note],
        ["Contact", [o.phone, o.email, o.lang].filter(Boolean).join(" · ")]]} />

      <div className="grid-2" id="privacy">
        <div className="card card--flat"><h3>What the business will see</h3>
          <ul className="small mb-0"><li>Case number, and you as &ldquo;Consumer&rdquo; with a number</li><li>What you bought, when and where</li><li>The problem and what you ask for</li><li>The files you allowed</li></ul></div>
        <div className="card card--flat"><h3>It never sees</h3>
          <ul className="small mb-0"><li>Your name, phone, email or address</li><li>Your ID document</li><li>The officer&apos;s own notes</li><li>Your other complaints</li></ul></div>
      </div>
      <CheckField required checked={draft.truth} onChange={e => set({ truth: e.target.checked })}>
        What I wrote is true to the best of my knowledge. I understand the office may contact me and the business about this complaint.</CheckField>
      {error && <p className="error-text show" role="alert">{error}</p>}
      <div className="form-foot">
        <button className="btn btn--secondary" type="button" onClick={back}>Back</button>
        <button className="btn btn--stack btn--accent" type="submit" disabled={busy}><span>{busy ? "Sending…" : "Send the complaint"}</span><Am text="ቅሬታውን ላክ" /></button>
      </div>
    </form>
  );
}
