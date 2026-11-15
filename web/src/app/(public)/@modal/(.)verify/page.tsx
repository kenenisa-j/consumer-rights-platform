import { ModalHead, RouteModal } from "@/components/ui/RouteModal";
import { VerifyForm } from "@/features/account/VerifyForm";

export default function VerifyModal() {
  return (
    <RouteModal title="Identity check" size="lg">
      <ModalHead title="Confirm who you are" am="ማንነትዎን ያረጋግጡ" lead="A complaint that asks for money back may need a confirmed identity." />
      <VerifyForm />
    </RouteModal>
  );
}
