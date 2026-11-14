import { Suspense } from "react";
import { ModalHead, RouteModal } from "@/components/ui/RouteModal";
import { TrackForms } from "@/features/track/TrackForms";

export default function TrackModal() {
  return (
    <RouteModal title="Track a case" size="md">
      <ModalHead title="Track a case" am="ጉዳይዎን ይከታተሉ" lead="Check the status without signing in." />
      <Suspense fallback={<p className="muted">Loading…</p>}><TrackForms /></Suspense>
    </RouteModal>
  );
}
