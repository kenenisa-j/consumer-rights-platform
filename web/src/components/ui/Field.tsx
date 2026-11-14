"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { Icon } from "./Icon";

// Form primitives using the prototype classes. Native constraint validation does the checking;
// components.css shows `.error-text` when the control is :user-invalid. Pass `error` for server errors.

interface Common {
  id: string;
  label: ReactNode;
  am?: string;
  hint?: ReactNode;
  invalid?: string;        // message shown for native validation failures
  error?: string | null;   // server/state error, always visible
  optional?: boolean;
  full?: boolean;
}

function Shell({ id, label, am, hint, invalid, error, optional, full, children }: Common & { children: ReactNode }) {
  return (
    <div className={`field${full ? " full" : ""}`}>
      <label htmlFor={id}>
        {label}{am && <> <span className="am" lang="am">{am}</span></>}
        {optional && <> <span className="opt">(optional)</span></>}
      </label>
      {children}
      {hint && <p className="hint" id={`${id}-hint`}>{hint}</p>}
      {invalid && <p className="error-text" id={`${id}-err`}>{invalid}</p>}
      {error && <p className="error-text show" id={`${id}-err`} role="alert">{error}</p>}
    </div>
  );
}

type InputProps = Omit<ComponentProps<"input">, "id" | "className">;
export function TextField({ id, label, am, hint, invalid, error, optional, full, ...rest }: Common & InputProps) {
  return (
    <Shell {...{ id, label, am, hint, invalid, error, optional, full }}>
      <input className="input" id={id} aria-describedby={hint ? `${id}-hint` : undefined}
        aria-invalid={error ? true : undefined} {...rest} />
    </Shell>
  );
}

type SelectProps = Omit<ComponentProps<"select">, "id" | "className"> & { options: readonly string[]; placeholder?: string };
export function SelectField({ id, label, am, hint, invalid, error, optional, full, options, placeholder, ...rest }: Common & SelectProps) {
  return (
    <Shell {...{ id, label, am, hint, invalid, error, optional, full }}>
      <select className="select" id={id} aria-invalid={error ? true : undefined} {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </Shell>
  );
}

type AreaProps = Omit<ComponentProps<"textarea">, "id" | "className">;
export function TextAreaField({ id, label, am, hint, invalid, error, optional, full, ...rest }: Common & AreaProps) {
  return (
    <Shell {...{ id, label, am, hint, invalid, error, optional, full }}>
      <textarea className="textarea" id={id} aria-invalid={error ? true : undefined} {...rest} />
    </Shell>
  );
}

export function CheckField({ children, ...rest }: Omit<ComponentProps<"input">, "type" | "className"> & { children: ReactNode }) {
  return <label className="check"><input type="checkbox" {...rest} /> <span>{children}</span></label>;
}

export interface ChoiceOption { value: string; title: string; text?: string }

/**
 * Radio cards for a few choices. With `dropdown`, a long list collapses into one select and the description of the
 * chosen option shows underneath, so the page does not become a wall of options.
 */
export function ChoiceGroup({ name, legend, options, value, onChange, required = true, columns, dropdown, placeholder = "Choose one" }: {
  name: string; legend: ReactNode; options: readonly ChoiceOption[]; value?: string;
  onChange?: (value: string) => void; required?: boolean; columns?: 1; dropdown?: boolean; placeholder?: string;
}) {
  const [own, setOwn] = useState(value ?? "");
  if (dropdown) {
    const current = onChange ? (value ?? "") : own;
    const picked = options.find(o => o.value === current);
    const id = `dd-${name}`;
    return (
      <div className="field">
        <label className="label" htmlFor={id}>{legend}</label>
        <select className="select" id={id} name={name} required={required} value={current} aria-describedby={`${id}-note`}
          onChange={e => (onChange ? onChange(e.target.value) : setOwn(e.target.value))}>
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.title}</option>)}
        </select>
        <p className="error-text" id={`${id}-err`}>{placeholder}.</p>
        <p className="select-note" id={`${id}-note`} aria-live="polite" hidden={!picked?.text}>
          <Icon name="check" /><span>{picked?.text}</span>
        </p>
      </div>
    );
  }
  return (
    <fieldset className="field">
      <legend className="label">{legend}</legend>
      <div className={`choice-grid${columns === 1 ? " choice-grid--1" : ""}`}>
        {options.map(o => (
          <label className="choice" key={o.value}>
            <input type="radio" name={name} value={o.value} required={required}
              {...(onChange ? { checked: value === o.value, onChange: () => onChange(o.value) } : { defaultChecked: value === o.value })} />
            <span><b>{o.title}</b>{o.text && <small>{o.text}</small>}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function FileDrop({ id, title, note, accept, ...rest }: Omit<ComponentProps<"input">, "type" | "className"> & { id: string; title: string; note: string }) {
  return (
    <label className="file-drop" htmlFor={id}>
      <Icon name="file" />
      <span><b>{title}</b><br /><span className="small muted">{note}</span></span>
      <input id={id} type="file" accept={accept ?? ".jpg,.jpeg,.png,.pdf"} {...rest} />
    </label>
  );
}
