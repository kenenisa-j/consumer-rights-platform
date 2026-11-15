import HomePage from "../../page";
import { ComplaintDialog } from "@/features/dialogs";

export const metadata = { title: "Make a complaint" };

// Six steps on one route, always in a dialog (over the home page when opened directly).
export default function NewComplaintPage() {
  return <><HomePage /><ComplaintDialog direct /></>;
}
