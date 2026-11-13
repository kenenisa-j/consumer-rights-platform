import { notFound } from "next/navigation";
import { Am } from "@/components/ui/Bi";
import { MessagesView } from "@/features/messages/MessagesView";
import { isGovLevel } from "@/features/gov/levels";
import { GOV_CONVERSATIONS } from "@/mocks/gov-conversations";

export const metadata = { title: "Messages" };

// Prototype: woreda|subcity|bureau/messages.html. Consumer, business and the offices above and below, in one place.
export default async function GovMessagesPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!isGovLevel(level)) notFound();
  return (
    <>
      <div className="ws-title"><div><h1>Messages<Am text="መልዕክቶች" /></h1>
        <p>Talk to the consumer, the business and the other offices. Write, attach a file, or make an offer.</p></div></div>
      <MessagesView conversations={GOV_CONVERSATIONS[level]} caseBase={`/${level}/cases`} />
    </>
  );
}
