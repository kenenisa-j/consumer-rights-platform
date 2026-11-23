"use client";

// Keeps files someone has chosen but not sent yet (the evidence of a complaint being written) in this browser's IndexedDB, so a page
// refresh or an accidental close does not lose them. They stay on this device and are removed when the complaint is sent.
const DB = "cr-files";
const STORE = "drafts";

export interface StoredFile { id: string; file: File; shared?: boolean }

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const run = async <T,>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> => {
  try {
    const db = await open();
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => { resolve(req.result); db.close(); };
      req.onerror = () => { reject(req.error); db.close(); };
    });
  } catch { return undefined; } // private mode or storage blocked: the form still works, only the refresh safety is lost
};

export const loadFiles = async (key: string): Promise<StoredFile[]> => ((await run("readonly", s => s.get(key))) as StoredFile[] | undefined) ?? [];
export const saveFiles = async (key: string, files: StoredFile[]): Promise<void> => { await run("readwrite", s => s.put(files, key)); };
export const clearFiles = async (key: string): Promise<void> => { await run("readwrite", s => s.delete(key)); };
