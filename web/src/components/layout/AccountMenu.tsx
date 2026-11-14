import Link from "next/link";
import { ROLES } from "@consumer-rights/contracts";
import { LANDING, initialsOf, portalOf, type Me } from "@/lib/session";
import { Icon } from "@/components/ui/Icon";
import { SignOutButton } from "./SignOutButton";

/** The signed-in person's menu in the public header (native <details>, works without JavaScript for opening). */
export function AccountMenu({ me }: { me: Me }) {
  const portal = portalOf(me) ?? "consumer";
  const role = me.roles.find(r => ROLES[r]);
  return (
    <details className="account">
      <summary aria-label={`Account menu for ${me.fullName}`}>
        <span className="avatar" aria-hidden="true">{initialsOf(me.fullName)}</span>
        <span className="who">{me.fullName}<small>{me.office?.nameEn ?? me.business?.tradeName ?? role?.replace(/_/g, " ")}</small></span>
      </summary>
      <div className="account-menu">
        {portal === "consumer" ? (
          <>
            <Link href="/my-cases">My cases <Icon name="folder" /></Link>
            <Link href="/notifications">Notifications <Icon name="bell" /></Link>
            <Link href="/messages">Messages <Icon name="chat" /></Link>
          </>
        ) : <Link href={LANDING[portal]}>Open my workspace <Icon name="grid" /></Link>}
        <hr />
        <SignOutButton className="account-menu__out">Sign out <Icon name="logout" /></SignOutButton>
      </div>
    </details>
  );
}
