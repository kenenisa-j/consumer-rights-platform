import type { ReactNode } from "react";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/components.css";
import "@/styles/patterns.css";
import "@/styles/print.css";
import "@/styles/office.css";
import "@/styles/merchant.css";
import "@/styles/app.css";

// The staff and business workspace look: navy and orange, `body.ws` redefines the colour tokens (office.css).
export const metadata = {
  title: { default: "Workspace · AddisB2B", template: "%s · AddisB2B" },
  robots: { index: false, follow: false } // staff screens are never indexed
};

export default function WorkspaceRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="ws">{children}</body>
    </html>
  );
}
