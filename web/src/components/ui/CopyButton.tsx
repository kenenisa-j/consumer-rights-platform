"use client";

import { useState, type ReactNode } from "react";

/** Copies text to the clipboard and says so ("Copied") for a moment. Falls back to selecting the text when the browser blocks copying. */
export function CopyButton({ text, children, className = "btn btn--secondary btn--sm", done = "Copied" }: { text: string; children: ReactNode; className?: string; done?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = document.createElement("textarea");
      t.value = text; t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); } finally { document.body.removeChild(t); }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };
  return (
    <button type="button" className={className} onClick={() => void copy()} aria-live="polite">
      {copied ? <><svg viewBox="0 0 24 24" aria-hidden="true" className="copy-ok"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" /></svg> {done}</> : children}
    </button>
  );
}
