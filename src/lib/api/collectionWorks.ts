"use client";

import { useEffect, useState } from "react";
import type { Artwork } from "../artworks";
import { fromCover } from "./adapt";
import { lookupCover } from "./coverIndex";
import { getCover } from "./endpoints";
import type { BookCoverResponse, CollectionItemResponse } from "./types";

const cache = new Map<string, Promise<BookCoverResponse | null>>();
const cover = (id: string) => {
  let p = cache.get(id);
  if (!p) {
    p = getCover(id).catch(() => null);
    cache.set(id, p);
  }
  return p;
};

/** Collection items → Artworks, hung in the order they were added. Redesigns are skipped. */
export function useCollectionWorks(items: CollectionItemResponse[] | undefined) {
  const [works, setWorks] = useState<Artwork[] | null>(null);
  const key = (items ?? []).map((i) => i.itemId).join(",");
  useEffect(() => {
    if (!items) return;
    let live = true;
    const list = [...items].filter((i) => i.itemType !== "REDESIGN").sort((a, b) => a.addedAt.localeCompare(b.addedAt));
    Promise.all(list.map(async (i) => {
      const c = await cover(i.itemId);
      return c ? fromCover(c, i.itemType, lookupCover(i.itemId)) : null;
    })).then((r) => live && setWorks(r.filter(Boolean) as Artwork[]));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return works;
}

/** Cover id behind a collection Artwork (`c-<coverId>`). */
export const coverIdOf = (a: Artwork) => a.remote?.coverId ?? a.id.replace(/^c-/, "");
