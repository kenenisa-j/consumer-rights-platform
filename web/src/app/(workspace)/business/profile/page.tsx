import { Alert, KeyValue, StatusPill } from "@/components/ui/Display";
import { Am } from "@/components/ui/Bi";
import { Icon } from "@/components/ui/Icon";
import { requirePortal } from "@/lib/session";
import { serverGet } from "@/lib/server-api";

export const metadata = { title: "Business profile" };

interface Profile {
  tradeName: string; legalName: string; registrationNumber: string; businessType: string; businessCategory: string; phoneNumber: string;
  stallNumber: string | null; verificationStatus: string; market: string | null; woredaOffice: { nameEn: string; phone: string };
  myRole: string; staff: { name: string; email: string | null; role: string; primary: boolean }[];
}

// Read from the database. Changing registration details is done with the Woreda trade office that registered the business.
export default async function BusinessProfilePage() {
  const me = await requirePortal("business", "/business/profile");
  const p = await serverGet<Profile>("/business/profile");
  return (
    <>
      <div className="ws-title"><div><h1>Business profile<Am text="የንግድ መገለጫ" /></h1><p>How your business is registered with the consumer protection office.</p></div></div>
      {!p ? <Alert tone="warn" icon="flag" title="We could not load the profile.">Try again in a moment.</Alert> : (
        <div className="layout">
          <div className="stack">
            <div className="card"><h2><Icon name="building" /> {p.tradeName}</h2>
              <KeyValue rows={[["Legal name", p.legalName], ["Registration number", p.registrationNumber], ["Type", p.businessType], ["Category", p.businessCategory],
                ["Place", [p.market, p.stallNumber && `Stall ${p.stallNumber}`].filter(Boolean).join(", ") || "—"], ["Phone", p.phoneNumber],
                ["Registered status", <StatusPill key="v" tone={p.verificationStatus === "VERIFIED" ? "ok" : "warn"}>{p.verificationStatus === "VERIFIED" ? "Verified" : p.verificationStatus}</StatusPill>]]} /></div>
            <div className="card"><h2><Icon name="users" /> People on this desk</h2>
              <div className="table-wrap"><table className="table table--stack">
                <thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th></tr></thead>
                <tbody>{p.staff.map(s => <tr key={s.name}><td><b>{s.name}</b>{s.name === me.fullName && <small>You</small>}</td><td data-label="Email">{s.email ?? "—"}</td>
                  <td data-label="Role">{s.role.toLowerCase()}{s.primary ? " · main contact" : ""}</td></tr>)}</tbody>
              </table></div></div>
          </div>
          <aside className="side">
            <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}>Registered at</h2>
              <p className="mb-0">{p.woredaOffice.nameEn}<br /><span className="small muted">{p.woredaOffice.phone}</span></p></div>
            <Alert tone="info" icon="bell" title="Need to change something?">Registration details are changed by the Woreda trade office above. Take your registration number with you.</Alert>
          </aside>
        </div>
      )}
    </>
  );
}
