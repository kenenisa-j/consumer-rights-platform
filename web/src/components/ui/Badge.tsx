import type { ReactNode } from "react";

export function Badge({ children, tone }: { children: ReactNode; tone?: "green" | "orange" | "proposed" | "later" }) {
  return <span className={`badge${tone ? ` badge--${tone}` : ""}`}>{children}</span>;
}
