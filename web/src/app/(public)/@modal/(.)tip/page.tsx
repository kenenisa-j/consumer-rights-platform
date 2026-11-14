import { ModalHead, RouteModal } from "@/components/ui/RouteModal";
import { TipForm } from "@/features/tip/TipForm";

export default function TipModal() {
  return (
    <RouteModal title="Report unfair trade" size="lg">
      <ModalHead title="Report unfair trade" am="ጥቆማ ይስጡ"
        lead="No account is needed and you can stay anonymous. A tip is never shown to a business." />
      <TipForm />
    </RouteModal>
  );
}
