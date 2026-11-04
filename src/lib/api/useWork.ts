"use client";

import { useEffect, useState } from "react";
import type { Artwork } from "../artworks";
import { loadWork } from "./works";

/** Client cache of fully loaded works (book + editions), with a small concurrency cap. */
const cache = new Map<string, Artwork | null>();
const pending = new Map<string, Promise<Artwork | null>>();
let active = 0;
const queue: (() => void)[] = [];
const MAX = 6;

function schedule<T>(job: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      active++;
      job().then(resolve, reject).finally(() => { active--; queue.shift()?.(); });
    };
    if (active < MAX) run(); else queue.push(run);
  });
}

export function fetchWork(id: string): Promise<Artwork | null> {
  if (cache.has(id)) return Promise.resolve(cache.get(id)!);
  let p = pending.get(id);
  if (!p) {
    p = schedule(() => loadWork(id, 0)).then((w) => { cache.set(id, w); pending.delete(id); return w; }, (e) => { pending.delete(id); throw e; });
    pending.set(id, p);
  }
  return p;
}

/** Expand a light (search-hit) artwork into the full work once `enabled`. */
export function useWork(light: Artwork, enabled: boolean): Artwork {
  const [full, setFull] = useState<Artwork | null>(() => (light.remote ? cache.get(light.id) ?? null : null));
  useEffect(() => {
    if (!enabled || !light.remote || full) return;
    let alive = true;
    fetchWork(light.id).then((w) => { if (alive && w) setFull(w); }).catch(() => {});
    return () => { alive = false; };
  }, [enabled, light, full]);
  return full ?? light;
}
