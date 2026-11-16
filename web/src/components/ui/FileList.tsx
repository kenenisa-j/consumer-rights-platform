"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { MB, formatSize } from "@/lib/format";
import { clearFiles, loadFiles, saveFiles } from "@/lib/file-store";

export type UploadState = "waiting" | "uploading" | "done" | "failed";
export interface PickedFile { id: string; file: File; shared?: boolean; status?: UploadState; message?: string }
export { MB, formatSize };

/** Keeps a validated list of chosen files: type, size and count limits with clear messages. `existing` counts files already stored. */
export function useFilePicker(max: number, maxMb: number, existing = 0, persistKey?: string) {
  const [files, setFiles] = useState<PickedFile[]>([]);
  const restored = useRef(!persistKey);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const add = (list: FileList | File[] | null) => {
    const incoming = Array.from(list ?? []);
    const problems: string[] = [];
    const next = [...files];
    for (const file of incoming) {
      if (!/\.(jpe?g|png|pdf)$/i.test(file.name)) { problems.push(`${file.name} is not a JPG, PNG or PDF.`); continue; }
      if (file.size > maxMb * MB) { problems.push(`${file.name} is larger than ${maxMb} MB.`); continue; }
      if (file.size === 0) { problems.push(`${file.name} is empty.`); continue; }
      if (existing + next.length >= max) { problems.push(`You can add up to ${max} files.`); break; }
      next.push({ id: `f${++seq.current}`, file, status: "waiting" });
    }
    setError(problems.length ? problems.join(" ") : null);
    setFiles(next);
  };
  const remove = (id: string) => { setFiles(f => f.filter(x => x.id !== id)); setError(null); };
  const toggleShared = (id: string) => setFiles(f => f.map(x => (x.id === id ? { ...x, shared: !x.shared } : x)));
  const mark = (id: string, status: UploadState, message?: string) => setFiles(f => f.map(x => (x.id === id ? { ...x, status, message } : x)));
  // With a key, the chosen files are kept on this device until they are sent, so a refresh does not lose them.
  useEffect(() => {
    if (!persistKey) return;
    let live = true;
    // Files from an earlier visit are dropped: they are kept only for the tab the complaint is being written in (a refresh keeps them).
    let sameTab = false;
    try { sameTab = sessionStorage.getItem(`cr:files:${persistKey}`) === "1"; sessionStorage.setItem(`cr:files:${persistKey}`, "1"); } catch { /* private mode */ }
    void (sameTab ? loadFiles(persistKey) : clearFiles(persistKey).then(() => [])).then(saved => {
      if (!live) return;
      seq.current = saved.length;
      if (saved.length) setFiles(saved.map((f, i) => ({ id: `r${i + 1}`, file: f.file, shared: f.shared, status: "waiting" as const })));
      restored.current = true;
    });
    return () => { live = false; };
  }, [persistKey]);
  useEffect(() => {
    if (!persistKey || !restored.current) return;
    void saveFiles(persistKey, files.map(f => ({ id: f.id, file: f.file, shared: f.shared })));
  }, [files, persistKey]);
  return { files, error, add, remove, toggleShared, mark, setFiles, clear: () => { setFiles([]); if (persistKey) void clearFiles(persistKey); } };
}

const STATUS_TEXT: Record<UploadState, string> = { waiting: "", uploading: "Uploading…", done: "Uploaded", failed: "Not uploaded" };

/**
 * One calm drop area, then a tidy list: name, size, a state, and Remove. The browser's own file control stays hidden (still keyboard
 * and screen-reader reachable through the label), and files can be dragged in.
 */
export function FilePicker({ id, picker, note, withShare, disabled }: {
  id: string; picker: ReturnType<typeof useFilePicker>; note: string; withShare?: boolean; disabled?: boolean;
}) {
  const [over, setOver] = useState(false);
  return (
    <div className="field">
      <label className={`dropzone${over ? " is-over" : ""}${disabled ? " is-off" : ""}`} htmlFor={id}
        onDragOver={e => { e.preventDefault(); if (!disabled) setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); if (!disabled) picker.add(e.dataTransfer.files); }}>
        <span className="dropzone__icon"><Icon name="file" /></span>
        <span className="dropzone__text"><b>Choose files</b> or drag them here<small>{note}</small></span>
        <input id={id} className="visually-hidden" type="file" multiple accept=".jpg,.jpeg,.png,.pdf" disabled={disabled}
          onChange={e => { picker.add(e.target.files); e.target.value = ""; }} />
      </label>
      {picker.error && <p className="error-text show" role="alert">{picker.error}</p>}
      {picker.files.length > 0 && (
        <ul className="picked" aria-label="Files you added">
          {picker.files.map(f => (
            <li key={f.id} className={`picked__row${f.status ? ` is-${f.status}` : ""}`}>
              <span className="picked__icon" aria-hidden="true"><Icon name="file" /></span>
              <span className="picked__main">
                <b>{f.file.name}</b>
                <small>{formatSize(f.file.size)}{f.status && STATUS_TEXT[f.status] ? ` · ${f.message ?? STATUS_TEXT[f.status]}` : ""}</small>
                {withShare && <label className="check mb-0"><input type="checkbox" checked={!!f.shared} disabled={disabled} onChange={() => picker.toggleShared(f.id)} /> The business may see this file</label>}
              </span>
              {f.status === "uploading" ? <span className="spinner" role="status" aria-label="Uploading" /> : (
                <button className="btn btn--ghost btn--sm" type="button" disabled={disabled} onClick={() => picker.remove(f.id)} aria-label={`Remove ${f.file.name}`}>Remove</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
