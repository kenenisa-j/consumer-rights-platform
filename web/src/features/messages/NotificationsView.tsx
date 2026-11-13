"use client";

import Link from "next/link";
import { useState } from "react";
import { ME } from "@/mocks/cases";
import { Icon } from "@/components/ui/Icon";

interface Note { id: string; href: string; title: string; text: string; when: string }

// Demo notifications of the signed-in consumer. Order: newest first.
const NOTES: readonly Note[] = [
  { id: "n1", href: "/cases/CC-2026-00123?step=settlement", title: "A solution was proposed for CC-2026-00123", text: "City Bureau: refund of 2,250 ETB. Please accept or decline.", when: "Wed 11 Nov, 11:10" },
  { id: "n2", href: "/cases/CC-2026-00140", title: "The officer needs more information for CC-2026-00140", text: "Please send the receipt by Tuesday 10 November.", when: "Thu 5 Nov, 09:40" },
  { id: "n3", href: "/cases/CC-2026-00123?step=subcity", title: "CC-2026-00123 moved to the Sub-City", text: "Not resolved at the Woreda. Meeting Monday 9 November, 14:00.", when: "Fri 6 Nov, 11:30" },
  { id: "n4", href: "/cases/CC-2026-00123?step=meeting", title: "Meeting set for CC-2026-00123", text: "Friday 6 November, 10:00, at the Woreda 7 Trade Office.", when: "Thu 5 Nov, 15:00" },
  { id: "n5", href: "/cases/CC-2026-00123?step=improved", title: "The business improved its offer for CC-2026-00123", text: "A full refund of 2,250 ETB. Accept it, or move it to the Woreda.", when: "Tue 3 Nov, 14:30" },
  { id: "n6", href: "/cases/CC-2026-00123", title: "The business made you an offer for CC-2026-00123", text: "A new 25 kg sack. Accept, make a counter-offer, or move it to the Woreda.", when: "Tue 3 Nov, 09:15" },
  { id: "n7", href: "/cases/CC-2026-00118", title: "CC-2026-00118 is not handled by this office", text: "See where you can go instead.", when: "Fri 30 Oct, 11:00" }
];

export function NotificationsView() {
  const [read, setRead] = useState<ReadonlySet<string>>(new Set(["n3", "n4", "n5", "n6", "n7"]));
  const [email, setEmail] = useState(true);
  const [saved, setSaved] = useState(false);
  const unread = NOTES.filter(n => !read.has(n.id)).length;

  return (
    <div className="layout">
      <div className="card">
        <div className="card-head">
          <h2>{unread ? `${unread} new` : "All read"}</h2>
          <button className="btn btn--ghost btn--sm" type="button" disabled={!unread} onClick={() => setRead(new Set(NOTES.map(n => n.id)))}>Mark all as read</button>
        </div>
        <ul className="link-list">
          {NOTES.map(n => (
            <li key={n.id}>
              <Link href={n.href} onClick={() => setRead(prev => new Set(prev).add(n.id))}>
                <Icon name="bell" />
                <span style={{ flex: 1 }}>
                  <b>{n.title}</b>{!read.has(n.id) && <> <span className="badge badge--orange">New</span></>}<br />
                  <span className="small muted">{n.text}</span>
                </span>
                <span className="small muted nowrap">{n.when}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <aside className="side">
        <div className="card card--flat">
          <h2 style={{ fontSize: "1.05rem" }}>How we tell you</h2>
          <form onSubmit={e => { e.preventDefault(); setSaved(true); }}>
            <label className="check mb-0"><input type="checkbox" checked disabled readOnly /> On this website (always)</label><br />
            <label className="check"><input type="checkbox" checked={email} onChange={e => { setEmail(e.target.checked); setSaved(false); }} /> By email to {ME.email}</label>
            <label className="check"><input type="checkbox" disabled /> By SMS <span className="badge badge--later">Later phase</span></label>
            <button className="btn btn--secondary btn--sm mt-4" type="submit">Save</button>
            <p className="small muted mt-4 mb-0" role="status">{saved ? "Saved." : ""}</p>
          </form>
        </div>
      </aside>
    </div>
  );
}
