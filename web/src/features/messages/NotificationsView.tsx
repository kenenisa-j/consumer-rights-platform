"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Alert } from "@/components/ui/Display";

interface Note { id: string; type: string; title: string; messageBody: string; isRead: boolean; createdAt: string; caseId: string | null }
interface Page { items: Note[]; total: number; unreadCount: number }

const REF = /CC-\d{4}-\d{5}/;
const ICON: Record<string, "bell" | "chat" | "folder" | "shield"> = { NEW_MESSAGE: "chat", COMPLAINT_RECEIVED: "shield", CASE_REDIRECTED: "folder" };

/** Where a notice about a complaint leads, for each kind of person. */
function linkFor(portal: string, text: string): string | null {
  const ref = REF.exec(text)?.[0];
  if (!ref) return null;
  const messageKind = /message/i.test(text);
  if (portal === "consumer") return messageKind ? `/messages?case=${ref}` : `/cases/${ref}`;
  if (portal === "business") return messageKind ? `/business/messages?case=${ref}` : `/business/complaints/${ref}`;
  return messageKind ? `/${portal}/messages?case=${ref}` : `/${portal}/cases/${ref}`;
}

const when = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Addis_Ababa" }).format(new Date(iso));

/**
 * The person's notifications from the database, newest first. Opening one marks it read and goes to the case or the chat. New ones appear
 * within seconds. The same screen serves the consumer, the business and the three government portals.
 */
export function NotificationsView({ portal, email }: { portal: string; email?: string | null }) {
  const [page, setPage] = useState<Page | null>(null);
  const [down, setDown] = useState(false);
  const [only, setOnly] = useState<"all" | "unread">("all");

  const load = useCallback(async () => {
    const r = await apiGet<Page>(`/api/notifications?limit=50${only === "unread" ? "&isRead=false" : ""}`);
    if (r.ok) { setPage(r.data); setDown(false); } else setDown(true);
  }, [only]);
  useEffect(() => { void load(); const t = setInterval(() => { if (!document.hidden) void load(); }, 10000); return () => clearInterval(t); }, [load]);

  const open = async (n: Note) => {
    if (!n.isRead) { setPage(p => p && { ...p, unreadCount: Math.max(0, p.unreadCount - 1), items: p.items.map(i => (i.id === n.id ? { ...i, isRead: true } : i)) }); void apiPatch(`/api/notifications/${n.id}/read`); }
  };
  const readAll = async () => { await apiPatch("/api/notifications/read-all"); await load(); };

  return (
    <div className="layout">
      <div className="card">
        <div className="card-head">
          <h2>{page ? (page.unreadCount ? `${page.unreadCount} new` : "All read") : "Notifications"}</h2>
          <div className="btn-row">
            <div className="seg seg--sm" role="tablist" aria-label="Show">
              {(["all", "unread"] as const).map(k => <button key={k} role="tab" type="button" aria-selected={only === k} onClick={() => setOnly(k)}>{k === "all" ? "All" : "Unread"}</button>)}
            </div>
            <button className="btn btn--ghost btn--sm" type="button" disabled={!page?.unreadCount} onClick={readAll}>Mark all as read</button>
          </div>
        </div>
        {down && <Alert tone="warn" icon="flag" title="We could not load your notifications.">Check your connection. We will try again in a few seconds.</Alert>}
        {page === null && !down && <p className="muted" role="status">Loading…</p>}
        {page && page.items.length === 0 && <p className="muted mb-0">{only === "unread" ? "Nothing new." : "No notifications yet. When something happens to a complaint, it appears here."}</p>}
        <ul className="link-list notes">
          {page?.items.map(n => {
            const href = linkFor(portal, `${n.title} ${n.messageBody}`);
            const body = (
              <>
                <Icon name={ICON[n.type] ?? "bell"} />
                <span style={{ flex: 1 }}>
                  <b>{n.title}</b>{!n.isRead && <> <span className="badge badge--orange">New</span></>}<br />
                  <span className="small muted">{n.messageBody}</span>
                </span>
                <span className="small muted nowrap">{when(n.createdAt)}</span>
              </>
            );
            return <li key={n.id} className={n.isRead ? "" : "is-new"}>{href ? <Link href={href} onClick={() => void open(n)}>{body}</Link> : <button type="button" className="note-btn" onClick={() => void open(n)}>{body}</button>}</li>;
          })}
        </ul>
      </div>
      <aside className="side">
        <div className="card card--flat">
          <h2 style={{ fontSize: "1.05rem" }}>How we tell you</h2>
          <p className="small">Notices always appear here on the website{email ? <>, and you can also choose to get them by email at <b>{email}</b> and by SMS when you make a complaint</> : ""}.</p>
          <p className="small muted mb-0">A new notice shows on the bell at the top of every page.</p>
        </div>
      </aside>
    </div>
  );
}
