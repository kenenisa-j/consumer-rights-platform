"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CATEGORY_TEXT } from "@/content/common";
import { CallBox } from "@/components/ui/Display";
import { Am } from "@/components/ui/Bi";
import { Icon } from "@/components/ui/Icon";
import { STEP_COUNT, STEP_NAMES, summary, type Draft } from "./draft";

interface Props {
  step: number;
  draft: Draft;
  freeCall: string;
  onGo: (step: number) => void;
  children: ReactNode;
}

/** The frame around every step: progress, the live "so far" summary, privacy note and help. */
export function WizardShell({ step, draft, freeCall, onGo, children }: Props) {
  const rows = summary(draft, c => CATEGORY_TEXT[c].title);
  return (
    <section className="wizard"><div className="wizard-box">
      <div className="wizard-head">
        <div>
          <span className="kicker">New complaint · step {step} of {STEP_COUNT}</span>
          <h1 id="wz-title" tabIndex={-1}>Make a complaint<Am text="ቅሬታ ያቅርቡ" /></h1>
        </div>
        <Link className="modal__close" href="/my-cases" aria-label="Close. Your answers are kept until you close this tab">×</Link>
      </div>
      <ol className="steps" aria-label={`Steps of the complaint form, step ${step} of ${STEP_COUNT}`}>
        {STEP_NAMES.map((name, i) => {
          const n = i + 1;
          const done = n < step;
          const cls = n === step ? "now" : done ? "done" : "";
          return (
            <li key={name} className={cls} aria-current={n === step ? "step" : undefined}>
              {n < step && n < draft.reached + 1 ? <button type="button" onClick={() => onGo(n)}>{name}</button> : name}
            </li>
          );
        })}
      </ol>
      <div className="layout layout--wide-side">
        <div>{children}</div>
        <aside className="side" aria-label="Your complaint so far">
          <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}>Your complaint so far</h2>
            <dl className="kv" style={{ gridTemplateColumns: "1fr" }}>
              {rows.map(r => <div key={r.label} style={{ display: "contents" }}><dt>{r.label}</dt><dd>{r.value ?? <span className="muted">Not yet</span>}</dd></div>)}
            </dl></div>
          <div className="card card--tint"><h2 style={{ fontSize: "1.05rem" }}><Icon name="shield" /> Your details stay private</h2>
            <p className="small mb-0">The business never sees your name, phone or address. It sees the case number and the facts it needs to reply.</p></div>
          <CallBox freeCall={freeCall} text="Need help with this form? Call free." />
          <p className="small"><Link href="/how-to-complain">How a complaint works</Link></p>
          <p className="small muted">Your answers are kept while this tab is open. Saving a draft to your account for 30 days comes with the backend.</p>
        </aside>
      </div>
    </div></section>
  );
}
