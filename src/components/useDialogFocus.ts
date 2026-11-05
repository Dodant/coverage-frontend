"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Modal focus: moves focus to `initial` on open, keeps Tab / Shift+Tab inside `root`,
 * and hands focus back to whatever opened the dialog when it closes.
 */
export function useDialogFocus(root: RefObject<HTMLElement | null>, initial: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    initial.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      const el = root.current;
      if (e.key !== "Tab" || !el) return;
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.getClientRects().length > 0);
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1], at = document.activeElement;
      if (!el.contains(at) || (e.shiftKey ? at === first : at === last)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); if (opener?.isConnected) opener.focus(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
