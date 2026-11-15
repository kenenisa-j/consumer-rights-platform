import { requirePortal } from "@/lib/session";
import { Suspense } from "react";
import { freeCallNumber } from "@/lib/config";
import { RouteModal } from "@/components/ui/RouteModal";
import { ComplaintWizard } from "@/features/complaint/ComplaintWizard";

export default async function NewComplaintModal() {
  const me = await requirePortal("consumer", "/complaint/new");
  return (
    <RouteModal title="Make a complaint" size="wide">
      <Suspense fallback={<p className="muted" role="status">Loading your form…</p>}><ComplaintWizard freeCall={freeCallNumber()} contact={{ first: me.fullName.split(" ")[0], phone: me.phoneNumber, email: me.email ?? "" }} /></Suspense>
    </RouteModal>
  );
}
