import { ModalHead, RouteModal } from "@/components/ui/RouteModal";
import { showTestAccounts } from "@/lib/config";
import { RegisterForm } from "@/features/account/RegisterForm";

export default function RegisterModal() {
  return (
    <RouteModal title="Create an account" size="lg">
      <ModalHead title="Create an account" am="ይመዝገቡ" lead="You need an account to make a complaint. A tip does not need one." />
      <RegisterForm devHint={showTestAccounts()} />
    </RouteModal>
  );
}
