"use client";

import { useEffect, useId, useRef } from "react";

/**
 * A native `popover="auto"` panel opened by `popoverTarget={id}` on a button: the browser
 * handles Esc, outside clicks and the trigger toggling it. Popovers live in the top layer, so
 * the panel is placed above its button when it opens (`.anchored-pop` in globals.css).
 * ponytail: CSS anchor positioning would replace the JS placement once Chrome ships it.
 */
export function useAnchoredPopover(onToggle: (open: boolean) => void) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const cb = useRef(onToggle);
  cb.current = onToggle;
  useEffect(() => {
    const p = panel.current;
    if (!p) return;
    const before = (e: Event) => {
      const b = button.current;
      if ((e as ToggleEvent).newState !== "open" || !b) return;
      const r = b.getBoundingClientRect();
      // Absolute in the top layer = document coordinates, so it scrolls with the page like the button.
      p.style.left = `${r.left + window.scrollX}px`;
      p.style.top = `${r.top + window.scrollY}px`;
    };
    const toggled = (e: Event) => cb.current((e as ToggleEvent).newState === "open");
    p.addEventListener("beforetoggle", before);
    p.addEventListener("toggle", toggled);
    return () => { p.removeEventListener("beforetoggle", before); p.removeEventListener("toggle", toggled); };
  }, []);
  return { id, button, panel };
}
