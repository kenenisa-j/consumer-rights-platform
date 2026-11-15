"use client";

import type { RefData } from "@/lib/reference";
import { Icon, type IconName } from "@/components/ui/Icon";
import { SelectField } from "@/components/ui/Field";
import type { Destination, Draft } from "./draft";

type Patch = Partial<Pick<Draft, "destination" | "destSubcity" | "destWoreda">>;

/**
 * The last choice before sending: who receives the complaint first. The City Bureau is the default, because it is the final level and
 * can see every complaint. "A Sub-City office" shows every Sub-City in a dropdown. "A Woreda office" asks for the Sub-City first, then
 * shows only the Woredas of that Sub-City. The place of purchase is only a starting suggestion: the person can pick any office.
 */
export function DestinationChoice({ draft, refData, onChange }: { draft: Draft; refData: RefData; onChange: (p: Patch) => void }) {
  const names = refData.subcities.map(s => s.name);
  const woredas = (refData.subcities.find(s => s.name === draft.destSubcity)?.woredas ?? []).map(w => String(w.number));
  const registered = draft.business.mode === "registered";

  const pick = (destination: Destination) => {
    // Start from the place of purchase when nothing was chosen yet, so most people only have to confirm.
    const sub = draft.destSubcity || (names.includes(draft.purchase.subcity) ? draft.purchase.subcity : "");
    const wo = draft.destWoreda || (sub === draft.purchase.subcity && woredasOf(refData, sub).includes(draft.purchase.woreda) ? draft.purchase.woreda : "");
    onChange(destination === "subcity" || destination === "woreda" ? { destination, destSubcity: sub, destWoreda: destination === "woreda" ? wo : draft.destWoreda } : { destination });
  };

  const options: { value: Destination; icon: IconName; title: string; text: string; off?: string }[] = [
    { value: "bureau", icon: "shield", title: "City Bureau", text: "The final level. It can settle the case itself or refer it on. Recommended when you want the strongest answer." },
    { value: "subcity", icon: "building", title: "A Sub-City office", text: "Choose the Sub-City trade office that should receive it." },
    { value: "woreda", icon: "pin", title: "A Woreda office", text: "Choose the Sub-City, then the Woreda. The closest office helps you and the business settle." },
    { value: "business", icon: "chat", title: registered ? `${draft.business.name} (the business)` : "The business", text: "The business replies first and you can agree an offer. If you cannot agree, you can move it to an office.",
      off: registered ? undefined : "Only a business registered on AddisB2B can receive it first." }
  ];

  return (
    <fieldset className="field dest">
      <legend className="label">Where do you want to send it?<span className="am" lang="am">ወዴት ይላክ?</span></legend>
      <div className="choice-grid choice-grid--1">
        {options.map(o => (
          <div key={o.value} className={`dest__option${draft.destination === o.value ? " is-on" : ""}`}>
            <label className={`choice${o.off ? " is-off" : ""}`}>
              <input type="radio" name="destination" value={o.value} checked={draft.destination === o.value} disabled={!!o.off} onChange={() => pick(o.value)} />
              <span><b><Icon name={o.icon} /> {o.title}{o.value === "bureau" && <span className="badge badge--green">Default</span>}</b><small>{o.off ?? o.text}</small></span>
            </label>
            {draft.destination === o.value && o.value === "subcity" && (
              <div className="dest__pick">
                <SelectField id="dest-sub" label="Sub-City" required options={names} placeholder="Choose a Sub-City" value={draft.destSubcity}
                  onChange={e => onChange({ destSubcity: e.target.value })} invalid="Choose the Sub-City." />
              </div>
            )}
            {draft.destination === o.value && o.value === "woreda" && (
              <div className="dest__pick dest__pick--two">
                <SelectField id="dest-sub" label="1. Sub-City" required options={names} placeholder="Choose a Sub-City" value={draft.destSubcity}
                  onChange={e => onChange({ destSubcity: e.target.value, destWoreda: "" })} invalid="Choose the Sub-City first." />
                <SelectField id="dest-wo" label="2. Woreda" required options={woredas} placeholder={draft.destSubcity ? "Choose a Woreda" : "Choose a Sub-City first"}
                  disabled={!draft.destSubcity} value={draft.destWoreda} onChange={e => onChange({ destWoreda: e.target.value })}
                  hint={draft.destSubcity ? `${woredas.length} Woredas in ${draft.destSubcity}` : undefined} invalid="Choose the Woreda." />
              </div>
            )}
          </div>
        ))}
      </div>
    </fieldset>
  );
}

const woredasOf = (ref: RefData, name: string) => (ref.subcities.find(s => s.name === name)?.woredas ?? []).map(w => String(w.number));
