import { Am } from "@/components/ui/Bi";
import { NotificationsView } from "@/features/messages/NotificationsView";

export const metadata = { title: "Notifications" };

export default function BizNotificationsPage() {
  return (
    <>
      <div className="ws-title"><div><h1>Notifications<Am text="ማሳወቂያዎች" /></h1><p>New complaints about your business and new messages.</p></div></div>
      <NotificationsView portal="business" />
    </>
  );
}
