"use client";

import { useState } from "react";
import { FileDrop } from "./Field";

export interface PickedFile { id: string; file: File; shared?: boolean }
export const MB = 1024 * 1024;

export const formatSize = (bytes: number) => (bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** Keeps a validated list of chosen files: type, size and count limits with clear messages. */
export function useFilePicker(max: number, maxMb: number) {
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const add = (list: FileList | null) => {
    const incoming = Array.from(list ?? []);
    const next = [...files];
    for (const file of incoming) {
      if (!/\.(jpe?g|png|pdf)$/i.test(file.name)) { setError(`${file.name} is not a JPG, PNG or PDF.`); continue; }
      if (file.size > maxMb * MB) { setError(`${file.name} is larger than ${maxMb} MB.`); continue; }
      if (next.length >= max) { setError(`You can add up to ${max} files.`); break; }
      next.push({ id: `${file.name}-${file.size}-${next.length}`, file });
      setError(null);
    }
    setFiles(next);
  };
  const remove = (id: string) => { setFiles(f => f.filter(x => x.id !== id)); setError(null); };
  const toggleShared = (id: string) => setFiles(f => f.map(x => (x.id === id ? { ...x, shared: !x.shared } : x)));
  return { files, error, add, remove, toggleShared, setFiles };
}

export function FilePicker({ id, picker, note, withShare }: {
  id: string; picker: ReturnType<typeof useFilePicker>; note: string; withShare?: boolean;
}) {
  return (
    <div className="field">
      <FileDrop id={id} title="Add files" note={note} multiple
        onChange={e => { picker.add(e.target.files); e.target.value = ""; }} />
      {picker.error && <p className="error-text show" role="alert">{picker.error}</p>}
      {picker.files.length > 0 && (
        <>
          <h3 className="mt-4" style={{ fontSize: "1rem" }}>Added ({picker.files.length})</h3>
          <ul className="file-list link-list">
            {picker.files.map(f => (
              <li key={f.id}>
                <span style={{ flex: 1 }}><b>{f.file.name}</b> <small className="muted">{formatSize(f.file.size)}</small>
                  {withShare && <label className="check mb-0"><input type="checkbox" checked={!!f.shared} onChange={() => picker.toggleShared(f.id)} /> Can be shown to the business</label>}
                </span>
                <button className="btn btn--ghost btn--sm" type="button" onClick={() => picker.remove(f.id)} aria-label={`Remove ${f.file.name}`}>Remove</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
