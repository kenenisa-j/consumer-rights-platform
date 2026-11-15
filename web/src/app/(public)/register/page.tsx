import { bi } from "@/content/types";
import { PageHead } from "@/components/ui/PageHead";
import { showTestAccounts } from "@/lib/config";
import { RegisterForm } from "@/features/account/RegisterForm";

export const metadata = { title: "Create an account" };

// Prototype: public/register.html
export default function RegisterPage() {
  return (
    <>
      <PageHead crumbs={[{ label: "Create an account" }]} title={bi("Create an account", "ይመዝገቡ")}
        lead="You need an account to make a complaint. A tip does not need one." />
      <section className="section"><div className="container"><div className="layout">
        <RegisterForm devHint={showTestAccounts()} />
        <aside className="side"><div className="card card--tint"><h2 style={{ fontSize: "1.05rem" }}>Why we ask</h2>
          <p className="small">Your phone and Woreda let the right office contact you. A refund or replacement may need us to confirm who you are.</p>
          <p className="small mb-0">You can still send a tip without an account.</p></div></aside>
      </div></div></section>
    </>
  );
}
