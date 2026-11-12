import type { ReactNode } from "react";
import { freeCallNumber } from "@/lib/config";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { SignInModal } from "./SignInModal";
import { CallModal } from "./CallModal";

/** The public (consumer) look: header, nav, shared dialogs, footer. Pages render inside <main>. */
export function PublicShell({ children }: { children: ReactNode }) {
  const freeCall = freeCallNumber();
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteHeader freeCall={freeCall} />
      <SignInModal />
      <CallModal freeCall={freeCall} />
      <main id="main">{children}</main>
      <SiteFooter freeCall={freeCall} />
    </>
  );
}
