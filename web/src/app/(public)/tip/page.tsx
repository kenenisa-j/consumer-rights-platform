import HomePage from "../page";
import { TipDialog } from "@/features/dialogs";

export const metadata = { title: "Report unfair trade" };

// Always a dialog: opened directly, it sits over the home page.
export default function TipPage() {
  return <><HomePage /><TipDialog direct /></>;
}
