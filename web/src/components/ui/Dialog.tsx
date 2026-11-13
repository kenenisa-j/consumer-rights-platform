"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { Bilingual } from "@/content/types";

interface Props {
  open: boolean;
  onClose: () => void;
  title: Bilingual | string;
  children: ReactNode;
}

/** Accessible modal on the native <dialog> element: focus trap, Escape and focus return are built in. */
export function Dialog({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const label = typeof title === "string" ? title : title.en;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dlg" aria-label={label} onClose={onClose}
      onClick={e => { if (e.target === ref.current) onClose(); }}>
      <div className="modal__box">
        <button type="button" className="modal__close" aria-label="Close" onClick={onClose}>×</button>
        <h2>{label}{typeof title !== "string" && <span className="am" lang="am">{title.am}</span>}</h2>
        {open && children}
      </div>
    </dialog>
  );
}
