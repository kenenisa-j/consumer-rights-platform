import { notFound } from "next/navigation";
import { Am } from "@/components/ui/Bi";
import { ChatApp } from "@/features/chat/ChatApp";
import { isGovLevel } from "@/features/gov/levels";

export const metadata = { title: "Messages" };

// Conversations with the consumers whose complaints your office holds. Text and voice messages.
export default async function GovMessagesPage({ params, searchParams }: { params: Promise<{ level: string }>; searchParams: Promise<{ case?: string }> }) {
  const { level } = await params;
  const { case: focus } = await searchParams;
  if (!isGovLevel(level)) notFound();
  return (
    <>
      <div className="ws-title"><div><h1>Messages<Am text="መልዕክቶች" /></h1><p>Talk to the consumers whose complaints your office holds.</p></div></div>
      <ChatApp caseBase={`/${level}/cases`} focusCase={focus} />
    </>
  );
}
