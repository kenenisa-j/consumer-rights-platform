import { Suspense } from "react";
import { freeCallNumber } from "@/lib/config";
import { requirePortal } from "@/lib/session";
import { getReference } from "@/lib/reference";
import { ModalHead, RouteModal } from "@/components/ui/RouteModal";
import { TipForm } from "@/features/tip/TipForm";
import { TipSent } from "@/features/tip/TipSent";
import { ComplaintWizard } from "@/features/complaint/ComplaintWizard";
import { ComplaintSent } from "@/features/complaint/ComplaintSent";

/**
 * The complaint and tip screens are always dialogs. The `@modal` intercepting routes show them over the page the person
 * was on; the plain pages show the same dialogs over the home page, so a typed address or a refresh looks the same.
 * `direct` sets where closing goes, because there is no earlier page to step back to.
 */
const home = (direct?: boolean) => (direct ? "/" : undefined);

export async function TipDialog({ direct }: { direct?: boolean }) {
  const { subcities } = await getReference();
  return (
    <RouteModal title="Report unfair trade" size="wide" closeTo={home(direct)}>
      <ModalHead title="Report unfair trade" am="ጥቆማ ይስጡ"
        lead="No account is needed and you can stay anonymous. A tip is never shown to a business." />
      <TipForm subcities={subcities} />
    </RouteModal>
  );
}

export function TipSentDialog() {
  return <RouteModal title="Tip received" size="md" closeTo="/"><TipSent /></RouteModal>;
}

export async function ComplaintDialog({ direct }: { direct?: boolean }) {
  const me = await requirePortal("consumer", "/complaint/new");
  const refData = await getReference();
  return (
    <RouteModal title="Make a complaint" size="wide" closeTo={home(direct)}>
      <Suspense fallback={<p className="muted" role="status">Loading your form…</p>}>
        <ComplaintWizard freeCall={freeCallNumber()} contact={{ first: me.fullName.split(" ")[0], phone: me.phoneNumber, email: me.email ?? "" }} refData={refData} />
      </Suspense>
    </RouteModal>
  );
}

export function ComplaintSentDialog() {
  return <RouteModal title="Complaint sent" size="lg" closeTo="/my-cases"><ComplaintSent freeCall={freeCallNumber()} /></RouteModal>;
}
