import { freeCallNumber } from "@/lib/config";
import { ComplaintSent } from "@/features/complaint/ComplaintSent";

export const metadata = { title: "Complaint sent" };

// Prototype: public/complaint-sent.html
export default function ComplaintSentPage() {
  return <section className="section"><div className="container narrow"><ComplaintSent freeCall={freeCallNumber()} /></div></section>;
}
