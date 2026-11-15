"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { uploadEvidence } from "@/lib/evidence";
import { FilePicker, useFilePicker } from "@/components/ui/FileList";

const MAX = 8;

/** Add more files to a complaint that already exists (a receipt found later, a photo that failed to upload). */
export function AddEvidence({ reference, existing }: { reference: string; existing: number }) {
  const router = useRouter();
  const picker = useFilePicker(MAX, 10, existing);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const left = MAX - existing;

  const upload = async () => {
    setBusy(true); setNote(null);
    let failed = 0;
    for (const f of picker.files.filter(x => x.status !== "done")) {
      picker.mark(f.id, "uploading");
      const r = await uploadEvidence(reference, f.file, !!f.shared);
      picker.mark(f.id, r.ok ? "done" : "failed", r.ok ? undefined : r.error);
      if (!r.ok) failed++;
    }
    setBusy(false);
    if (failed === 0) { picker.clear(); setNote("Your files were added."); }
    else setNote(`${failed} ${failed === 1 ? "file was" : "files were"} not uploaded. Remove it or try again.`);
    router.refresh();
  };

  if (left <= 0) return <p className="small muted mb-0">This complaint already has the most files it can hold ({MAX}).</p>;
  return (
    <div className="card card--flat"><h2 style={{ fontSize: "1.05rem" }}>Add evidence</h2>
      <FilePicker id="more-files" picker={picker} note={`JPG, PNG or PDF · up to 10 MB each · ${left} more ${left === 1 ? "file" : "files"}`} withShare disabled={busy} />
      <p className="small muted">Officers always see your files. The business sees only the ones you allow.</p>
      {note && <p className="small" role="status">{note}</p>}
      {picker.files.length > 0 && <button className="btn" type="button" onClick={upload} disabled={busy}>{busy ? "Uploading…" : `Upload ${picker.files.length === 1 ? "the file" : `${picker.files.length} files`}`}</button>}
    </div>
  );
}
