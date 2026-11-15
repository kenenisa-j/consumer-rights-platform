import HomePage from "../../page";
import { TipSentDialog } from "@/features/dialogs";

export const metadata = { title: "Tip received" };

// The code is handed over in sessionStorage, never placed in the address.
export default function TipSentPage() {
  return <><HomePage /><TipSentDialog /></>;
}
