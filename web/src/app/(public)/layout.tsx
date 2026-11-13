import type { ReactNode } from "react";
import "@/styles/public.css";
import "@/styles/app.css";
import { PublicShell } from "@/components/layout/PublicShell";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
