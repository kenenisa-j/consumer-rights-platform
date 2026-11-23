import { requirePortal } from "@/lib/session";
import { bi } from "@/content/types";
import { PageHead } from "@/components/ui/PageHead";
import { NotificationsView } from "@/features/messages/NotificationsView";

export const metadata = { title: "Notifications" };

// Real notifications from the database: complaint received, messages, a case moved to another office.
export default async function NotificationsPage() {
  const me = await requirePortal("consumer", "/notifications");
  return (
    <>
      <PageHead crumbs={[{ label: "My cases", href: "/my-cases" }, { label: "Notifications" }]} title={bi("Notifications", "ማሳወቂያዎች")} />
      <section className="section"><div className="container"><NotificationsView portal="consumer" email={me.email} /></div></section>
    </>
  );
}
