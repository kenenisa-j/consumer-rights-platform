import { Icon } from "@/components/ui/Icon";
import { Am } from "@/components/ui/Bi";
import { FREE_CALL_HOURS } from "@/lib/config";

export function CallModal({ freeCall }: { freeCall: string }) {
  return (
    <div className="modal" id="call" role="dialog" aria-modal="true" aria-labelledby="call-title">
      <div className="modal__box">
        <a className="modal__close" href="#" aria-label="Close">×</a>
        <span className="icon-bubble icon-bubble--orange"><Icon name="phone" /></span>
        <h2 id="call-title" className="mt-4">Call us for free<Am text="በነጻ ይደውሉ" /></h2>
        <p>You pay nothing for this call. An officer of the City Bureau answers, writes down your complaint, gives you a case number and sends it to the right office.</p>
        <p className="center"><a className="call-box__num" style={{ fontSize: "1.6rem", padding: "10px 26px" }} href={`tel:${freeCall}`}>{freeCall}</a></p>
        <p className="center small muted">{FREE_CALL_HOURS.en}</p>
        <h3 style={{ fontSize: "1rem" }}>Have these ready</h3>
        <ul className="small">
          <li>What you bought, where and when</li>
          <li>The name of the business</li>
          <li>The receipt, if you have it</li>
          <li>What you want: refund, replacement or repair</li>
        </ul>
        <div className="btn-row">
          <a className="btn btn--accent" href={`tel:${freeCall}`}><Icon name="phone" /> Call {freeCall}</a>
          <a className="btn btn--secondary" href="#">Close</a>
        </div>
      </div>
    </div>
  );
}
