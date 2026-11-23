import type { ReactNode } from "react";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/components.css";
import "@/styles/patterns.css";
import "@/styles/print.css";
import "@/styles/public.css";
import "@/styles/app.css";
import "@/styles/site.css";
import "@/styles/pages.css";
import "@/styles/chat.css";
import "@/styles/header.css";
import "@/styles/theme.css";
import { PublicShell } from "@/components/layout/PublicShell";
import { LangRuntime } from "@/components/i18n/LangRuntime";
import { getLocale } from "@/lib/locale";

// Each route group has its own root layout, so the public and workspace stylesheets never mix.
export const metadata = {
  title: { default: "Consumer Protection · AddisB2B", template: "%s · Consumer Protection · AddisB2B" },
  description: "Make a complaint or report a problem to the Addis Ababa consumer protection offices."
};

export default async function PublicLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} data-translating={locale === "en" ? undefined : "1"} suppressHydrationWarning>
      <body suppressHydrationWarning><PublicShell>{children}</PublicShell>{modal}<LangRuntime locale={locale} /></body>
    </html>
  );
}
