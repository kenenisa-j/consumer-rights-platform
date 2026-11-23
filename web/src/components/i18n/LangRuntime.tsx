"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/i18n";

type Dict = Record<string, string>;

/**
 * Shows the page in the chosen language. The text in the code is English; this looks every piece of visible text up in the language's
 * dictionary (exact sentence, or a pattern with {0} for a number or name) and swaps it in place. It changes text only, never the page
 * structure, so React is not disturbed, and it keeps watching so later screens (dialogs, new pages, chat) are translated too.
 * Text with no entry stays English, and what people typed (names, complaints, messages) is never touched.
 */
export function LangRuntime({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    if (locale === "en") return;
    let alive = true;
    let observer: MutationObserver | null = null;
    let raf = 0;
    const exact = new Map<string, string>();
    const patterns: [RegExp, string][] = [];
    const queue = new Set<Node>();

    const norm = (s: string) => s.replace(/\s+/g, " ").trim();
    const lookup = (raw: string): string | null => {
      const key = norm(raw);
      if (!key || key.length > 400) return null;
      const hit = exact.get(key);
      if (hit) return hit;
      for (const [re, to] of patterns) {
        const m = re.exec(key);
        if (m) return to.replace(/\{(\d)\}/g, (_, i) => m[Number(i) + 1] ?? "");
      }
      return null;
    };
    const skip = (el: Element | null) => !el || !!el.closest("script,style,textarea,code,[data-notranslate],.am,.tg-feed .tg-bubble p,.ref");

    const text = (n: Text) => {
      const v = n.nodeValue ?? "";
      if (!v.trim() || skip(n.parentElement)) return;
      const to = lookup(v);
      if (to && to !== norm(v)) n.nodeValue = (v.match(/^\s*/)?.[0] ?? "") + to + (v.match(/\s*$/)?.[0] ?? "");
    };
    const attrs = (el: Element) => {
      if (skip(el)) return;
      for (const a of ["placeholder", "title", "aria-label", "alt"]) {
        const v = el.getAttribute(a);
        if (v) { const to = lookup(v); if (to && to !== v) el.setAttribute(a, to); }
      }
      if (el instanceof HTMLInputElement && (el.type === "submit" || el.type === "button") && el.value) { const to = lookup(el.value); if (to) el.value = to; }
    };
    const walk = (root: Node) => {
      if (root.nodeType === 3) { text(root as Text); return; }
      if (root.nodeType !== 1) return;
      const el = root as Element;
      if (skip(el)) return;
      attrs(el);
      const w = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) { if (n.nodeType === 3) text(n as Text); else attrs(n as Element); }
    };
    const flush = () => {
      raf = 0;
      for (const n of queue) if (n.isConnected) walk(n);
      queue.clear();
      const t = lookup(document.title); if (t) document.title = t;
    };
    const schedule = (n: Node) => { queue.add(n); if (!raf) raf = requestAnimationFrame(flush); };

    const load: Promise<{ default: Dict }> =
      locale === "am" ? import("@/i18n/dict/am") : locale === "om" ? import("@/i18n/dict/om") : locale === "ti" ? import("@/i18n/dict/ti") : import("@/i18n/dict/so");
    void load.then(mod => {
      if (!alive) return;
      for (const [k, v] of Object.entries(mod.default)) {
        if (k.includes("{0}")) {
          const re = new RegExp("^" + k.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{(\d)\}/g, "(\\S+(?: \\S+){0,3}?)") + "$");
          patterns.push([re, v]);
        } else exact.set(norm(k), v);
      }
      walk(document.body); flush();
      document.documentElement.removeAttribute("data-translating");
      observer = new MutationObserver(list => {
        for (const m of list) {
          if (m.type === "characterData") schedule(m.target);
          else if (m.type === "attributes") schedule(m.target);
          else m.addedNodes.forEach(n => schedule(n));
        }
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "title", "aria-label", "alt"] });
    }).catch(() => document.documentElement.removeAttribute("data-translating"));
    const failsafe = window.setTimeout(() => document.documentElement.removeAttribute("data-translating"), 1500);

    return () => { alive = false; observer?.disconnect(); if (raf) cancelAnimationFrame(raf); clearTimeout(failsafe); };
  }, [locale]);
  return null;
}
