import { bi } from "@/content/types";
import { PageHead } from "@/components/ui/PageHead";
import { MessagesView } from "@/features/messages/MessagesView";

export const metadata = { title: "Messages" };

// Prototype: public/messages.html. Improved: state-driven list/thread (works on phones), offers can be answered in place.
export default function MessagesPage() {
  return (
    <>
      <PageHead crumbs={[{ label: "My cases", href: "/my-cases" }, { label: "Messages" }]} title={bi("Messages", "መልዕክቶች")}
        lead="Talk to the business and to the offices handling your complaint. You can write, attach a file, or make an offer." />
      <section className="section"><div className="container"><MessagesView /></div></section>
    </>
  );
}
