import type { ReactNode } from "react";
import { LangRuntime } from "@/components/i18n/LangRuntime";
import { getLocale } from "@/lib/locale";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/components.css";
import "@/styles/patterns.css";
import "@/styles/print.css";
import "@/styles/office.css";
import "@/styles/merchant.css";
import "@/styles/app.css";
import "@/styles/pages.css";
import "@/styles/chat.css";
import "@/styles/theme.css";

// The staff and business workspace look: the same forest green and orange as the AddisB2B portals, on a white sidebar (office.css).
export const metadata = {
  title: { default: "Workspace · AddisB2B", template: "%s · AddisB2B" },
  robots: { index: false, follow: false } // staff screens are never indexed
};

export default async function WorkspaceRootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} data-translating={locale === "en" ? undefined : "1"} suppressHydrationWarning>
      <body className="ws" suppressHydrationWarning>{children}<LangRuntime locale={locale} /></body>
    </html>
  );
}
