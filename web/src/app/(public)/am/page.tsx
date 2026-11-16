import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "መነሻ" };

// Prototype: public/home-am.html. A fully Amharic page, proving Amharic works as the main language (NFR-008).
const STEPS = [
  ["ያሳውቁን", "በማንኛውም ጊዜ በኦንላይን። ደረሰኝ ወይም ፎቶ ካለዎት ያያይዙ።"],
  ["ወረዳው ያጣራል", "ባለሙያው ቅሬታውን ይመለከታል፤ ተጨማሪ መረጃ ሊጠይቅዎ ይችላል።"],
  ["ከድርጅቱ ጋር እንነጋገራለን", "ባለሙያው ያጣራል፣ ድርጅቱ ምላሽ እንዲሰጥ ይጠይቃል፤ ለእርቅና ድርድር ያገናኛችኋል።"],
  ["ውጤት ያገኛሉ", "ገንዘብ ተመላሽ፣ ምትክ ወይም ጥገና፤ ካልተፈታ ጉዳዩ ለበላይ አካል ይተላለፋል።"]
] as const;
const RIGHTS = [
  { href: "/rights#receipt", icon: "file", t: "ደረሰኝ ይጠይቁ", p: "ደረሰኝ የከፈሉትንና የገዙበትን ቦታ ያሳያል። ችግር ሲፈጠር ዋናው ማስረጃ ነው።" },
  { href: "/rights#safe", icon: "shield", t: "ቀኑንና ክብደቱን ያረጋግጡ", p: "ጊዜው ያለፈ ምግብና የጎደለ ክብደት አይፈቀድም። ከመክፈልዎ በፊት ያረጋግጡ።" },
  { href: "/rights#faulty", icon: "refresh", t: "የተበላሸ ዕቃ ይስተካከላል", p: "እንደተነገረው የማይሰራ ዕቃ ገንዘቡ ሊመለስ፣ ሊቀየር ወይም ሊጠገን ይችላል።" }
] as const;

export default function AmharicHomePage() {
  return (
    <div lang="am">
      <section className="hero"><div className="container hero-grid">
        <div>
          <span className="kicker">የሸማቾች መብት ጥበቃ ዳይሬክቶሬት</span>
          <h1>የተበላሸ፣ አደገኛ ወይም ፍትሃዊ ያልሆነ ዕቃ ገዝተዋል?</h1>
          <p className="lead">ለወረዳዎ ንግድ ጽ/ቤት ያሳውቁ። እውነታውን እናጣራለን፣ ከድርጅቱ ጋር እንነጋገራለን፣ ገንዘብዎ እንዲመለስ፣ ዕቃው እንዲቀየር ወይም እንዲጠገን እናግዛለን።</p>
          <div className="btn-row">
            <Link className="btn btn--accent btn--lg" href="/complaint/new">ቅሬታ ያቅርቡ</Link>
            <Link className="btn btn--secondary btn--lg" href="/track">ጉዳይዎን ይከታተሉ</Link>
          </div>
        </div>
        <div className="paths">
          <Link className="path" href="/complaint/new">
            <span className="icon-bubble icon-bubble--orange"><Icon name="chat" /></span>
            <span><b>ቅሬታ ያቅርቡ</b><p>የገዙት ዕቃ ወይም አገልግሎት እንዲስተካከል ይፈልጋሉ፦ ገንዘብ ተመላሽ፣ ምትክ ወይም ጥገና። የጉዳይ ቁጥርና መረጃ ያገኛሉ።</p>
              <span className="go">ቅሬታ ይጀምሩ <Icon name="arrow" /></span></span>
          </Link>
          <Link className="path" href="/tip">
            <span className="icon-bubble"><Icon name="flag" /></span>
            <span><b>በገበያ ያዩትን ችግር ይጠቁሙ</b><p>ከተወሰነው ዋጋ በላይ መሸጥ፣ ዕቃ መደበቅ፣ ጊዜው ያለፈ ምግብ ወይም የተሳሳተ ሚዛን። መመዝገብ አያስፈልግም፤ ስምዎን መግለጽ የለብዎትም።</p>
              <span className="go">ጥቆማ ይላኩ <Icon name="arrow" /></span></span>
          </Link>
        </div>
      </div></section>

      <section className="section section--alt"><div className="container">
        <div className="section-title"><h2>ቅሬታ እንዴት ይስተናገዳል</h2>
          <p>እያንዳንዱ ቅሬታ ቁጥር ያገኛል፤ ዕቃውን ወደገዙበት አካባቢ ንግድ ጽ/ቤት ይላካል።</p></div>
        <ol className="how">{STEPS.map(([b, p]) => <li key={b}><b>{b}</b><p>{p}</p></li>)}</ol>
      </div></section>

      <section className="section"><div className="container">
        <div className="section-title"><h2>መብትዎን ይወቁ</h2></div>
        <div className="grid-3">{RIGHTS.map(r => (
          <Link key={r.href} className="card card--accent news-card" href={r.href}>
            <span className="icon-bubble"><Icon name={r.icon} /></span><h3>{r.t}</h3><p className="muted mb-0">{r.p}</p>
          </Link>))}</div>
      </div></section>

      <section className="section section--tight"><div className="container">
        <div className="alert"><Icon name="bell" /><div><strong>ይህ ገጽ ሙሉ በሙሉ በአማርኛ ተዘጋጅቷል።</strong>
          <p>ሌሎቹ ገጾች በእንግሊዝኛና በአማርኛ ተጽፈዋል። <Link href="/" lang="en">English home page</Link></p></div></div>
      </div></section>
    </div>
  );
}
