"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiPost, type ApiResult } from "@/lib/api";
import { uploadEvidence } from "@/lib/evidence";
import type { RefData } from "@/lib/reference";
import { saveHandoff } from "@/lib/handoff";
import { useFilePicker } from "@/components/ui/FileList";
import { STEP_COUNT, clearDraft, emptyDraft, loadDraft, saveDraft, type Draft } from "./draft";
import { Step1, Step2, Step3 } from "./StepsA";
import { Step4, Step5, Step6 } from "./StepsB";
import { WizardShell } from "./WizardShell";

/**
 * Six steps on ONE route. The step lives in state, not in the address, so the form works the same as a page and as a
 * dialog. Answers live in the draft (sessionStorage), so a refresh never loses typing. A step can only be opened once the
 * earlier ones are completed.
 */
export function ComplaintWizard({ freeCall, contact, refData, locale = "en" }: { freeCall: string; contact: { first: string; phone: string; email: string }; refData: RefData; locale?: string }) {
  const router = useRouter();
  const [requested, setRequested] = useState(1);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft("", "", locale));
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const picker = useFilePicker(8, 10, 0, "complaint-evidence");
  const first = useRef(true);

  // After a refresh the form comes back with the answers and at the furthest step reached, so nothing has to be re-clicked.
  useEffect(() => { const d = loadDraft(emptyDraft("", "", locale)); setDraft(d); setRequested(Math.min(Math.max(1, d.reached), STEP_COUNT)); setReady(true); }, []);
  useEffect(() => { if (ready) saveDraft(draft); }, [draft, ready]);
  useEffect(() => {
    setDraft(d => ({ ...d, fileNames: picker.files.map(f => ({ name: f.file.name, size: f.file.size, shared: !!f.shared })) }));
  }, [picker.files]);

  const step = Math.min(Math.max(1, requested), STEP_COUNT, draft.reached);
  useEffect(() => {
    if (!ready) return;
    if (first.current) { first.current = false; return; }
    document.getElementById("wz-title")?.focus();
    document.getElementById("wz-title")?.scrollIntoView({ block: "start" });
  }, [step, ready]);

  const set = useCallback((patch: Partial<Draft>) => setDraft(d => ({ ...d, ...patch })), []);
  const go = (n: number) => setRequested(n);
  const next = () => { set({ reached: Math.max(draft.reached, step + 1) }); go(step + 1); };
  const back = () => go(step - 1);

  const send = async () => {
    if (busy) return; // a second tap must not send a second complaint
    setBusy(true); setError(null);
    const { business: b, purchase: p, outcome: o } = draft;
    const sub = (name: string) => refData.subcities.find(s => s.name === name)?.code;
    const registered = b.mode === "registered";
    let res: ApiResult<{ reference: string; sentAt: string; toBusiness: boolean; handledBy: string }>;
    try {
      res = await apiPost<{ reference: string; sentAt: string; toBusiness: boolean; handledBy: string }>("/api/complaints", {
      category: draft.category, subject: draft.subject, narrative: draft.what, urgent: draft.urgent, destination: draft.destination,
      subcityCode: sub(draft.destination === "woreda" || draft.destination === "subcity" ? draft.destSubcity : p.subcity),
      woreda: draft.destination === "woreda" ? Number(draft.destWoreda) || null : null,
      merchantId: registered ? b.id : null, otherBusinessName: registered ? "" : b.name,
      otherBusinessPlace: [b.address, b.subcity, b.woreda && `Woreda ${b.woreda}`].filter(Boolean).join(", "), otherBusinessPhone: b.phone,
      item: p.item, purchasedOn: p.date, paid: p.paid === "" ? null : Number(p.paid), loss: p.loss === "" ? null : Number(p.loss),
      receipt: p.receipt === "no" || p.receipt === "lost" ? "no" : "yes", want: o.want, wantAmount: o.amount === "" ? null : Number(o.amount),
      contactPhone: o.phone, contactEmail: o.email, language: o.lang, notifyEmail: o.byEmail, notifySms: o.bySms
      });
    } catch {
      setError("Your complaint could not be submitted. Check your connection and try again. Your answers are still here.");
      setBusy(false);
      return;
    }
    if (!res.ok) { setError(res.error); setBusy(false); return; }
    // The complaint exists now. Files go up one by one; any that fail are reported, and can be added again from the case page.
    const failed: string[] = [];
    const todo = picker.files;
    for (let i = 0; i < todo.length; i++) {
      setProgress(`Uploading file ${i + 1} of ${todo.length}…`);
      picker.mark(todo[i].id, "uploading");
      try {
        const up = await uploadEvidence(res.data.reference, todo[i].file, !!todo[i].shared);
        picker.mark(todo[i].id, up.ok ? "done" : "failed", up.ok ? undefined : up.error);
        if (!up.ok) failed.push(todo[i].file.name);
      } catch {
        failed.push(todo[i].file.name);
        picker.mark(todo[i].id, "failed", "Upload failed. You can add it again from the case page.");
      }
    }
    setProgress(null);
    saveHandoff("complaint-receipt", { ...res.data, first: contact.first, email: draft.outcome.email, phone4: draft.outcome.phone.replace(/D/g, "").slice(-4), failedFiles: failed, fileCount: todo.length });
    clearDraft(); picker.clear();
    router.push("/complaint/sent");
  };

  if (!ready) return <p className="container muted" role="status">Loading your form…</p>;
  const props = { draft, set, next, back, refData };
  return (
    <WizardShell step={step} draft={draft} freeCall={freeCall} onGo={go} categoryTitle={code => refData.categories.find(c => c.code === code)?.nameEn ?? code}>
      {step === 1 && <Step1 {...props} />}
      {step === 2 && <Step2 {...props} />}
      {step === 3 && <Step3 {...props} />}
      {step === 4 && <Step4 {...props} picker={picker} />}
      {step === 5 && <Step5 {...props} />}
      {step === 6 && <Step6 {...props} onGo={go} onSend={send} busy={busy} error={error} progress={progress} fileCount={picker.files.length} />}
    </WizardShell>
  );
}
