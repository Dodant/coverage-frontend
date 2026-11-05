"use client";

import { createContext, useContext } from "react";
import type { Artwork } from "./artworks";

/**
 * The set of works the home page draws from: the bundled mock set, or (live data) the newest
 * works loaded on the server. Home sections read it instead of importing the mock list.
 */
const Ctx = createContext<{ works: Artwork[]; live: boolean }>({ works: [], live: false }); // the home page always provides it

export function CatalogProvider({ works, live, children }: { works: Artwork[]; live: boolean; children: React.ReactNode }) {
  return <Ctx.Provider value={{ works, live }}>{children}</Ctx.Provider>;
}
export const useCatalog = () => useContext(Ctx);
