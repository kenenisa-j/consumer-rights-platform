import { bi } from "@/content/types";
import { PageHead } from "@/components/ui/PageHead";
import { VerifyForm } from "@/features/account/VerifyForm";

export const metadata = { title: "Identity check" };

// Prototype: public/verify.html. Fayda verification stays a disabled "Later phase" option (SRS 10.1).
export default function VerifyPage() {
  return (
    <>
      <PageHead crumbs={[{ label: "My cases", href: "/my-cases" }, { label: "Identity check" }]} title={bi("Confirm who you are", "ማንነትዎን ያረጋግጡ")}
        lead="A complaint that asks for money back may need a confirmed identity." />
      <section className="section"><div className="container narrow"><VerifyForm /></div></section>
    </>
  );
}
