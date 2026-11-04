"use client";

/**
 * Shared-element navigation using the View Transitions API.
 * The clicked cover gets `view-transition-name: artwork-active`; the viewing room's
 * hero image carries the same name, so the browser morphs one into the other.
 * Falls back to a normal navigation when the API is unavailable or motion is reduced.
 */
type Push = (href: string, opts?: { scroll?: boolean }) => void;

let resolveReady: (() => void) | null = null;

export function markViewReady() {
  resolveReady?.();
  resolveReady = null;
}

export function navigateWithArtwork(push: Push, href: string, el?: HTMLElement | null) {
  const doc = document as Document & { startViewTransition?: (cb: () => Promise<void>) => unknown };
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduced) {
    push(href);
    return;
  }
  document.querySelectorAll<HTMLElement>("[data-vt-active],[data-vt-hero]").forEach((n) => {
    n.style.viewTransitionName = "";
    n.removeAttribute("data-vt-active");
  });
  if (el) {
    el.style.viewTransitionName = "artwork-active";
    el.setAttribute("data-vt-active", "");
  }
  doc.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        const t = window.setTimeout(resolve, 900);
        resolveReady = () => {
          window.clearTimeout(t);
          resolve();
        };
        push(href);
      }),
  );
}
