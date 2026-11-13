"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface TabDef { id: string; label: string; panel: ReactNode }

/** Accessible tabs: roving focus with the arrow keys, Home and End. Only the open panel is rendered. */
export function Tabs({ tabs, label }: { tabs: TabDef[]; label: string }) {
  const [active, setActive] = useState(tabs[0].id);
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (e: KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    const next = e.key === "ArrowRight" ? (index + 1) % tabs.length : e.key === "ArrowLeft" ? (index + last) % tabs.length
      : e.key === "Home" ? 0 : e.key === "End" ? last : -1;
    if (next < 0) return;
    e.preventDefault();
    setActive(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div>
      <div className="tab-bar" role="tablist" aria-label={label}>
        {tabs.map((t, i) => (
          <button key={t.id} ref={el => { refs.current[i] = el; }} role="tab" type="button" id={`${base}-t-${t.id}`}
            aria-selected={active === t.id} aria-controls={`${base}-p-${t.id}`} tabIndex={active === t.id ? 0 : -1}
            onClick={() => setActive(t.id)} onKeyDown={e => move(e, i)}
            style={{ border: 0, borderBottom: `3px solid ${active === t.id ? "var(--orange)" : "transparent"}`, background: "none", font: "inherit", cursor: "pointer",
              padding: "var(--s3) var(--s4)", fontWeight: 700, whiteSpace: "nowrap", color: active === t.id ? "var(--green)" : "var(--muted)" }}>
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map(t => (
        <div key={t.id} role="tabpanel" id={`${base}-p-${t.id}`} aria-labelledby={`${base}-t-${t.id}`} hidden={active !== t.id} tabIndex={0}>
          {active === t.id && t.panel}
        </div>
      ))}
    </div>
  );
}
