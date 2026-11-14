"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

const CloseContext = createContext<(() => void) | null>(null);

/** The close action of the route dialog around the caller, or null when the page is shown on its own. */
export function useModalClose() { return useContext(CloseContext); }

/** A link on a normal page, a close button inside a route dialog. Use it for Cancel and Close. */
export function CloseOrLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const close = useModalClose();
  return close
    ? <button type="button" className={className} onClick={close}>{children}</button>
    : <Link className={className} href={href}>{children}</Link>;
}

/**
 * A form or chooser shown in a dialog over the page the person was on. The same address still opens as a normal page
 * when it is typed in or refreshed (see the `@modal` intercepting routes). Closing goes back one step in history.
 */
export function RouteModal({ title, size = "md", children }: { title: string; size?: "sm" | "md" | "lg" | "wide"; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const home = useRef(pathname);   // the address this dialog belongs to
  const ref = useRef<HTMLDialogElement>(null);
  const leaving = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    leaving.current = false;
    if (dialog && !dialog.open) dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { leaving.current = true; document.body.style.overflow = overflow; if (dialog?.open) dialog.close(); };
  }, []);

  const close = () => { if (!leaving.current) router.back(); };

  // Next keeps the last dialog in its slot when the person moves to an ordinary page (for example after sending a
  // complaint). The dialog belongs to one address, so it steps aside as soon as the address changes.
  if (pathname !== home.current) return null;

  return (
    <CloseContext.Provider value={close}>
      <dialog ref={ref} className={`dlg dlg--${size}`} aria-label={title}
        // A "close" that arrives while the dialog is open again is a leftover of React re-running the mount effect in development.
        onClose={() => { if (!ref.current?.open) close(); }}
        onClick={e => { if (e.target === ref.current) close(); }}>
        <div className="modal__box">
          <button type="button" className="modal__close" aria-label="Close" onClick={close}>×</button>
          {children}
        </div>
      </dialog>
    </CloseContext.Provider>
  );
}

export function ModalHead({ title, am, lead }: { title: string; am?: string; lead?: ReactNode }) {
  return (
    <div className="modal-head">
      <h2>{title}{am && <span className="am" lang="am">{am}</span>}</h2>
      {lead && <p>{lead}</p>}
    </div>
  );
}
