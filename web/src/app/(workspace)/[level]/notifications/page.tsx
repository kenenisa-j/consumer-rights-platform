import { notFound } from "next/navigation";
import { Am } from "@/components/ui/Bi";
import { NotificationsView } from "@/features/messages/NotificationsView";
import { isGovLevel } from "@/features/gov/levels";

export const metadata = { title: "Notifications" };

export default async function GovNotificationsPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!isGovLevel(level)) notFound();
  return (
    <>
      <div className="ws-title"><div><h1>Notifications<Am text="ማሳወቂያዎች" /></h1><p>Cases sent to your office and new messages from consumers.</p></div></div>
      <NotificationsView portal={level} />
    </>
  );
}
