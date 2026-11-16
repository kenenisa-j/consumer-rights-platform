"use client";

import { LOCALES, LOCALE_COOKIE, type Locale } from "@/lib/i18n";

/** The language dropdown. The choice is kept in a cookie for a year, and the page reloads in that language. */
export function LanguageSwitcher({ locale, className = "" }: { locale: Locale; className?: string }) {
  const change = (code: string) => {
    document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  };
  return (
    <label className={`lang-switch ${className}`.trim()}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="lang-switch__ico"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.7 3.9 5.7 3.9 9s-1.3 6.3-3.9 9c-2.6-2.7-3.9-5.7-3.9-9S9.4 5.7 12 3z" /></svg>
      <span className="visually-hidden">Language</span>
      <select value={locale} onChange={e => change(e.target.value)} aria-label="Language">
        {LOCALES.map(l => <option key={l.code} value={l.code} data-notranslate>{l.native}</option>)}
      </select>
    </label>
  );
}
