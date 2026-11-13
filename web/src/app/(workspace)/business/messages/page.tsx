import { Am } from "@/components/ui/Bi";
import { MessagesView } from "@/features/messages/MessagesView";
import { BIZ_CONVERSATIONS } from "@/mocks/biz-conversations";

export const metadata = { title: "Messages" };

// Prototype: merchant/messages.html. The same conversation screen as the consumer's, on the business's data.
export default function BizMessagesPage() {
  return (
    <>
      <div className="ws-title"><div><h1>Messages<Am text="መልዕክቶች" /></h1><p>Talk to the consumer and to the government offices. Write, attach a file, or make an offer.</p></div></div>
      <MessagesView conversations={BIZ_CONVERSATIONS} caseBase="/business/complaints" />
    </>
  );
}
