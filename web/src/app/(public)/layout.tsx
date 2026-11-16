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
import { PublicShell } from "@/components/layout/PublicShell";

// Each route group has its own root layout, so the public (green) and workspace (navy) stylesheets never mix.
export const metadata = {
  title: { default: "Consumer Protection · AddisB2B", template: "%s · Consumer Protection · AddisB2B" },
  description: "Make a complaint or report a problem to the Addis Ababa consumer protection offices."
};

export default function PublicLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning><PublicShell>{children}</PublicShell>{modal}</body>
    </html>
  );
}
