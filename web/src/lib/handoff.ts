"use client";

// Short-lived hand-off of a result (receipt, private code) from a form page to its confirmation page.
// sessionStorage keeps secrets out of URLs and browser history, and the data vanishes with the tab.
export function saveHandoff<T>(key: string, value: T): void {
  try { sessionStorage.setItem(`cr:${key}`, JSON.stringify(value)); } catch { /* private mode: page shows a fallback */ }
}

export function readHandoff<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(`cr:${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

export function clearHandoff(key: string): void {
  try { sessionStorage.removeItem(`cr:${key}`); } catch { /* ignore */ }
}
