import { TipSent } from "@/features/tip/TipSent";

export const metadata = { title: "Tip received" };

// Prototype: public/tip-sent.html. The code is handed over in sessionStorage, never placed in the address.
export default function TipSentPage() {
  return <section className="section"><div className="container narrow"><TipSent /></div></section>;
}
