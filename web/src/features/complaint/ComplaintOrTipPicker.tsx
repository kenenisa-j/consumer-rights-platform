import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

/** The two ways in, shown in a dialog. The full side-by-side comparison stays on /complaint-or-tip. */
export function ComplaintOrTipPicker() {
  return (
    <>
      <div className="pick">
        <Link replace href="/complaint/new">
          <span className="icon-bubble icon-bubble--orange"><Icon name="chat" /></span>
          <span><b>Make a complaint</b><small>You bought something and want it put right: a refund, replacement or repair. Needs an account. The business never sees your name or phone.</small></span>
          <span className="go"><Icon name="arrow" /></span>
        </Link>
        <Link replace href="/tip">
          <span className="icon-bubble"><Icon name="flag" /></span>
          <span><b>Report unfair trade</b><small>You saw a problem in the market that affects others, such as overpricing or false scales. No account, and you can stay anonymous.</small></span>
          <span className="go"><Icon name="arrow" /></span>
        </Link>
      </div>
      <p className="pick-help">Not sure which? <a href="/complaint-or-tip">See them side by side</a>.</p>
    </>
  );
}
