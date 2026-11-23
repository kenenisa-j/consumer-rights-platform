import type { ReactNode } from "react";
import { freeCallNumber } from "@/lib/config";
import { getMe } from "@/lib/session";
import { getLocale } from "@/lib/locale";
import { serverGet } from "@/lib/server-api";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { SignInModal } from "./SignInModal";
import { CallModal } from "./CallModal";

/** The public (consumer) look: header, nav, shared dialogs, footer. Pages render inside <main>. */
export async function PublicShell({ children }: { children: ReactNode }) {
  const freeCall = freeCallNumber();
  const me = await getMe();
  const locale = await getLocale();
  const unread = me ? (await serverGet<{ unreadCount: number }>("/notifications/unread-count"))?.unreadCount ?? 0 : 0;
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteHeader freeCall={freeCall} me={me} locale={locale} unread={unread} />
      {!me && <SignInModal />}
      <CallModal freeCall={freeCall} />
      <main id="main">{children}</main>
      <SiteFooter freeCall={freeCall} />
    </>
  );
}
