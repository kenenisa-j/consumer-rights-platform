import { bi } from "@/content/types";
import { PageHead } from "@/components/ui/PageHead";
import { NotificationsView } from "@/features/messages/NotificationsView";

export const metadata = { title: "Notifications" };

// Prototype: public/notifications.html. Improved: opening an item marks it read; email preference is saved inline.
export default function NotificationsPage() {
  return (
    <>
      <PageHead crumbs={[{ label: "My cases", href: "/my-cases" }, { label: "Notifications" }]} title={bi("Notifications", "ማሳወቂያዎች")} />
      <section className="section"><div className="container"><NotificationsView /></div></section>
    </>
  );
}
