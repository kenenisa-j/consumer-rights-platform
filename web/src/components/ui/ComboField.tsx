"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface ComboOption { value: string; label: string }

interface Props {
  id: string;
  label: ReactNode;
  am?: string;
  hint?: ReactNode;
  invalid?: string;
  optional?: boolean;
  full?: boolean;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  options: readonly (string | ComboOption)[];
  value: string;
  onChange: (value: string) => void;
  /** Said when typing matches nothing. */
  emptyText?: string;
  name?: string;
}

const norm = (o: string | ComboOption): ComboOption => (typeof o === "string" ? { value: o, label: o } : o);

/**
 * A dropdown you can also type into: the list opens on click or focus, narrows as you type, and a choice is made with the mouse,
 * the arrow keys and Enter. Only values from the list are accepted, so the data is always one of the real options.
 */
export function ComboField({ id, label, am, hint, invalid, optional, full, required, disabled, placeholder, options, value, onChange, emptyText = "Nothing matches. Check the spelling.", name }: Props) {
  const list = useMemo(() => options.map(norm), [options]);
  const labelOf = (v: string) => list.find(o => o.value === v)?.label ?? "";
  const [query, setQuery] = useState(labelOf(value));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const boxId = useId();
  const editing = useRef(false); // while the person is typing, outside changes must not overwrite the text

  // Follow the chosen value when it changes from outside (for example the Woreda clears when the Sub-City changes).
  useEffect(() => { if (!editing.current) setQuery(labelOf(value)); }, [value, list]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { input.current?.setCustomValidity(required && !value ? "Choose one from the list." : ""); }, [required, value]);

  const typed = query.trim().toLowerCase();
  const exact = !!typed && list.some(o => o.label.toLowerCase() === typed);
  const shown = useMemo(() => {
    if (!typed || exact) return list; // nothing typed, or a full choice is showing: offer everything
    const starts = list.filter(o => o.label.toLowerCase().startsWith(typed));
    const words = list.filter(o => !o.label.toLowerCase().startsWith(typed) && o.label.toLowerCase().split(/[\s-]+/).some(w => w.startsWith(typed)));
    const inside = list.filter(o => !starts.includes(o) && !words.includes(o) && o.label.toLowerCase().includes(typed));
    return [...starts, ...words, ...inside];
  }, [list, typed, exact]);

  const choose = (o: ComboOption) => { editing.current = false; onChange(o.value); setQuery(o.label); setOpen(false); };
  const commit = () => {
    editing.current = false;
    const hit = list.find(o => o.label.toLowerCase() === typed);
    if (hit) { if (hit.value !== value) onChange(hit.value); setQuery(hit.label); }
    else if (value) setQuery(labelOf(value)); // typed nonsense: go back to the last real choice
    else if (typed) onChange(""); // keep the text visible, the field stays invalid
    setOpen(false);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive(a => Math.min(a + 1, shown.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && open) { e.preventDefault(); const pick = shown[active] ?? (shown.length === 1 ? shown[0] : undefined); if (pick) choose(pick); }
    else if (e.key === "Escape" && open) { e.stopPropagation(); editing.current = false; setOpen(false); setQuery(labelOf(value)); }
  };

  useEffect(() => { document.getElementById(`${boxId}-${active}`)?.scrollIntoView({ block: "nearest" }); }, [active, boxId]);

  return (
    <div className={`field${full ? " full" : ""}`}>
      <label htmlFor={id}>
        {label}{am && <> <span className="am" lang="am">{am}</span></>}{optional && <> <span className="opt">(optional)</span></>}
      </label>
      <div className="combo">
        <input ref={input} id={id} className="input combo__input" type="text" role="combobox" autoComplete="off" spellCheck={false}
          aria-expanded={open} aria-controls={`${boxId}-list`} aria-autocomplete="list" aria-activedescendant={open && shown[active] ? `${boxId}-${active}` : undefined}
          aria-describedby={hint ? `${id}-hint` : undefined} placeholder={placeholder} disabled={disabled} required={required && !value}
          value={query}
          onChange={e => { editing.current = true; setQuery(e.target.value); setOpen(true); setActive(0); if (value) onChange(""); }}
          onFocus={() => { setOpen(true); input.current?.select(); }} onClick={() => setOpen(true)} onBlur={commit} onKeyDown={onKey} />
        {name && <input type="hidden" name={name} value={value} />}
        {open && !disabled && (
          <ul className="combo__list" id={`${boxId}-list`} role="listbox" aria-label={typeof label === "string" ? label : undefined}>
            {shown.length === 0 && <li className="combo__empty" role="status">{emptyText}</li>}
            {shown.map((o, i) => (
              <li key={o.value} id={`${boxId}-${i}`} role="option" aria-selected={i === active} className={`combo__opt${o.value === value ? " is-chosen" : ""}`}
                onMouseDown={e => { e.preventDefault(); choose(o); }} onMouseEnter={() => setActive(i)}>{o.label}</li>
            ))}
          </ul>
        )}
      </div>
      {hint && <p className="hint" id={`${id}-hint`}>{hint}</p>}
      {invalid && <p className="error-text" id={`${id}-err`}>{invalid}</p>}
    </div>
  );
}
