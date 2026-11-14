import { ModalHead, RouteModal } from "@/components/ui/RouteModal";
import { ComplaintOrTipPicker } from "@/features/complaint/ComplaintOrTipPicker";

export default function ComplaintOrTipModal() {
  return (
    <RouteModal title="What would you like to do?" size="md">
      <ModalHead title="What would you like to do?" am="ምን ማድረግ ይፈልጋሉ?" />
      <ComplaintOrTipPicker />
    </RouteModal>
  );
}
