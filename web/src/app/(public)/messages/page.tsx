import { requirePortal } from "@/lib/session";
import { ChatApp } from "@/features/chat/ChatApp";

export const metadata = { title: "Messages" };

// Real conversations from the database: one per complaint, with the business or the office that holds it. Text and voice messages.
export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ case?: string }> }) {
  await requirePortal("consumer", "/messages");
  const { case: focus } = await searchParams;
  return (
    <section className="section section--tight"><div className="container">
      <ChatApp caseBase="/cases" focusCase={focus} />
    </div></section>
  );
}
