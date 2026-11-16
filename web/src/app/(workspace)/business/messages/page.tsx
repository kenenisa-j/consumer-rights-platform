import { Am } from "@/components/ui/Bi";
import { ChatApp } from "@/features/chat/ChatApp";

export const metadata = { title: "Messages" };

// Conversations with consumers who complained about this business. The consumer is only ever "Consumer 00123".
export default async function BizMessagesPage({ searchParams }: { searchParams: Promise<{ case?: string }> }) {
  const { case: focus } = await searchParams;
  return (
    <>
      <div className="ws-title"><div><h1>Messages<Am text="መልዕክቶች" /></h1><p>Talk to the consumers who complained about your business. Write, or send a voice message.</p></div></div>
      <ChatApp caseBase="/business/complaints" focusCase={focus} />
    </>
  );
}
