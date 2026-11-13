import Link from "next/link";
import type { ReactNode } from "react";
import type { Bilingual } from "@/content/types";
import { Bi } from "./Bi";

export interface Crumb { label: string; href?: string }

interface Props {
  crumbs?: Crumb[];
  kicker?: string;
  title: Bilingual | string;
  lead?: ReactNode;
  children?: ReactNode;
}

/** Breadcrumb trail, optional kicker, page title (with Amharic line) and lead text. */
export function PageHead({ crumbs, kicker, title, lead, children }: Props) {
  return (
    <section className="page-head"><div className="container">
      {crumbs && (
        <nav aria-label="You are here">
          <ol className="crumbs">
            <li><Link href="/">Home</Link></li>
            {crumbs.map((c, i) => (
              <li key={c.label} aria-current={i === crumbs.length - 1 ? "page" : undefined}>
                {c.href && i < crumbs.length - 1 ? <Link href={c.href}>{c.label}</Link> : c.label}
              </li>
            ))}
          </ol>
        </nav>
      )}
      {kicker && <span className="kicker">{kicker}</span>}
      <h1>{typeof title === "string" ? title : <Bi t={title} />}</h1>
      {lead && <p className="lead">{lead}</p>}
      {children}
    </div></section>
  );
}
