"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Opens `root` (a <dialog>) as a native modal: the browser keeps focus inside and makes the
 * page behind it inert. Focus starts on `initial`; Esc calls `onClose` (so React runs the
 * exit animation), and focus goes back to whatever opened the dialog when it unmounts.
 */
export function useModalDialog(root: RefObject<HTMLDialogElement | null>, initial: RefObject<HTMLElement | null>, onClose: () => void) {
  const close = useRef(onClose);
  close.current = onClose;
  // Read once at first render: StrictMode's effect re-run would otherwise see our own Close button.
  const [opener] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null));
  useEffect(() => {
    const d = root.current;
    if (!d) return;
    if (!d.open) d.showModal();
    initial.current?.focus();
    // Esc fires `cancel`; keep the dialog open for the exit animation. If the browser closes it
    // anyway (repeated Esc without a click in between), `close` still tells React.
    const cancel = (e: Event) => { e.preventDefault(); close.current(); };
    const closed = () => close.current();
    d.addEventListener("cancel", cancel);
    d.addEventListener("close", closed);
    return () => {
      d.removeEventListener("cancel", cancel);
      d.removeEventListener("close", closed);
      // No d.close() here: unmounting removes the dialog (and closes it); under StrictMode's
      // re-run a queued `close` event would shut the dialog the moment it opened.
      if (opener?.isConnected) opener.focus();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
