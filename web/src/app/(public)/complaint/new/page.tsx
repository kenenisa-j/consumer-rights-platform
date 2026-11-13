import { Suspense } from "react";
import { freeCallNumber } from "@/lib/config";
import { ComplaintWizard } from "@/features/complaint/ComplaintWizard";

export const metadata = { title: "Make a complaint" };

// Prototype: public/complaint-1-what.html ... complaint-6-review.html. Six steps on one route.
export default function NewComplaintPage() {
  return <Suspense fallback={<p className="container muted">Loading your form…</p>}><ComplaintWizard freeCall={freeCallNumber()} /></Suspense>;
}
