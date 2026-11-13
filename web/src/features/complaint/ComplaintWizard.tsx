"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ME } from "@/mocks/cases";
import { submitComplaint } from "@/mocks/misc";
import { saveHandoff } from "@/lib/handoff";
import { useFilePicker } from "@/components/ui/FileList";
import { STEP_COUNT, clearDraft, emptyDraft, loadDraft, saveDraft, type Draft } from "./draft";
import { Step1, Step2, Step3 } from "./StepsA";
import { Step4, Step5, Step6 } from "./StepsB";
import { WizardShell } from "./WizardShell";

/**
 * Six steps on ONE route: /complaint/new?step=n. Answers live in the draft (sessionStorage) so Back, refresh and
 * the step links never lose typing. A step can only be opened once the earlier ones are completed.
 */
export function ComplaintWizard({ freeCall }: { freeCall: string }) {
  const router = useRouter();
  const requested = Number(useSearchParams().get("step")) || 1;
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(ME.phone, ME.email));
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const picker = useFilePicker(8, 10);
  const first = useRef(true);

  useEffect(() => { setDraft(loadDraft(emptyDraft(ME.phone, ME.email))); setReady(true); }, []);
  useEffect(() => { if (ready) saveDraft(draft); }, [draft, ready]);
  useEffect(() => {
    setDraft(d => ({ ...d, fileNames: picker.files.map(f => ({ name: f.file.name, size: f.file.size, shared: !!f.shared })) }));
  }, [picker.files]);

  const step = Math.min(Math.max(1, requested), STEP_COUNT, draft.reached);
  useEffect(() => {
    if (!ready) return;
    if (step !== requested) router.replace(`/complaint/new?step=${step}`, { scroll: false });
    if (first.current) { first.current = false; return; }
    document.getElementById("wz-title")?.focus();
    window.scrollTo({ top: 0 });
  }, [step, requested, ready, router]);

  const set = useCallback((patch: Partial<Draft>) => setDraft(d => ({ ...d, ...patch })), []);
  const go = (n: number) => router.push(`/complaint/new?step=${n}`, { scroll: false });
  const next = () => { set({ reached: Math.max(draft.reached, step + 1) }); go(step + 1); };
  const back = () => go(step - 1);

  const send = async () => {
    setBusy(true); setError(null);
    try {
      const receipt = await submitComplaint(); // the backend stores the complaint; evidence uploads follow
      saveHandoff("complaint-receipt", { ...receipt, first: ME.first, email: draft.outcome.email,
        toBusiness: draft.business.mode === "registered", business: draft.business.name });
      clearDraft();
      router.push("/complaint/sent");
    } catch { setError("Your complaint was not sent. Check your connection and try again. Your answers are still here."); setBusy(false); }
  };

  if (!ready) return <p className="container muted" role="status">Loading your form…</p>;
  const props = { draft, set, next, back };
  return (
    <WizardShell step={step} draft={draft} freeCall={freeCall} onGo={go}>
      {step === 1 && <Step1 {...props} />}
      {step === 2 && <Step2 {...props} />}
      {step === 3 && <Step3 {...props} />}
      {step === 4 && <Step4 {...props} picker={picker} />}
      {step === 5 && <Step5 {...props} />}
      {step === 6 && <Step6 {...props} onGo={go} onSend={send} busy={busy} error={error} fileCount={picker.files.length} />}
    </WizardShell>
  );
}
