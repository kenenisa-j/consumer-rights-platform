import HomePage from "../../page";
import { ComplaintSentDialog } from "@/features/dialogs";

export const metadata = { title: "Complaint sent" };

export default function ComplaintSentPage() {
  return <><HomePage /><ComplaintSentDialog /></>;
}
