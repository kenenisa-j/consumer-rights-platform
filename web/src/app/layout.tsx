import type { ReactNode } from "react";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/components.css";
import "@/styles/patterns.css";
import "@/styles/print.css";

export const metadata = {
  title: { default: "Consumer Protection · AddisB2B", template: "%s · Consumer Protection · AddisB2B" },
  description: "Make a complaint or report a problem to the Addis Ababa consumer protection offices."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
