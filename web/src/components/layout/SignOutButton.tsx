"use client";

import { useState, type ReactNode } from "react";
import { signOut } from "@/lib/auth-client";

/** Ends the session on the server, then returns to the public home page. */
export function SignOutButton({ className, children }: { className?: string; children: ReactNode }) {
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" className={className} disabled={busy}
      onClick={async () => { setBusy(true); await signOut(); window.location.assign("/"); }}>
      {children}
    </button>
  );
}
