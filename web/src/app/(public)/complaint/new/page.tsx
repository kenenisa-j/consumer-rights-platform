import { requirePortal } from "@/lib/session";
import { Suspense } from "react";
import { freeCallNumber } from "@/lib/config";
import { ComplaintWizard } from "@/features/complaint/ComplaintWizard";

export const metadata = { title: "Make a complaint" };

// Prototype: public/complaint-1-what.html ... complaint-6-review.html. Six steps on one route.
export default async function NewComplaintPage() {
  const me = await requirePortal("consumer", "/complaint/new");
  return <Suspense fallback={<p className="container muted">Loading your form…</p>}><ComplaintWizard freeCall={freeCallNumber()} contact={{ first: me.fullName.split(" ")[0], phone: me.phoneNumber, email: me.email ?? "" }} /></Suspense>;
}
