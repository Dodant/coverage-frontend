"use client";

import { useSyncExternalStore } from "react";

export interface Collection {
  id: string;
  name: string;
  note: string;
  ids: string[];
  createdAt: number;
}
interface State {
  favorites: string[];
  collections: Collection[];
}

const KEY = "coverage:v1";
const EMPTY: State = { favorites: [], collections: [] };
let state: State = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable — stay in memory */
  }
}
function commit(next: State) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  load();
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      loaded = false;
      load();
      listeners.forEach((x) => x());
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}
const getSnapshot = () => {
  load();
  return state;
};
const getServerSnapshot = () => EMPTY;

export function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const uid = () => Math.random().toString(36).slice(2, 9);

export const actions = {
  toggleFavorite(id: string) {
    const has = state.favorites.includes(id);
    commit({ ...state, favorites: has ? state.favorites.filter((x) => x !== id) : [id, ...state.favorites] });
    return !has;
  },
  createCollection(name: string, ids: string[] = []) {
    const c: Collection = { id: uid(), name: name.trim() || "Untitled Exhibition", note: "", ids, createdAt: Date.now() };
    commit({ ...state, collections: [c, ...state.collections] });
    return c;
  },
  renameCollection(id: string, name: string) {
    commit({ ...state, collections: state.collections.map((c) => (c.id === id ? { ...c, name: name.trim() || c.name } : c)) });
  },
  setNote(id: string, note: string) {
    commit({ ...state, collections: state.collections.map((c) => (c.id === id ? { ...c, note } : c)) });
  },
  deleteCollection(id: string) {
    commit({ ...state, collections: state.collections.filter((c) => c.id !== id) });
  },
  toggleInCollection(cid: string, artId: string) {
    commit({
      ...state,
      collections: state.collections.map((c) =>
        c.id === cid ? { ...c, ids: c.ids.includes(artId) ? c.ids.filter((x) => x !== artId) : [...c.ids, artId] } : c,
      ),
    });
  },
  moveInCollection(cid: string, artId: string, dir: -1 | 1) {
    commit({
      ...state,
      collections: state.collections.map((c) => {
        if (c.id !== cid) return c;
        const i = c.ids.indexOf(artId), j = i + dir;
        if (i < 0 || j < 0 || j >= c.ids.length) return c;
        const ids = [...c.ids];
        [ids[i], ids[j]] = [ids[j], ids[i]];
        return { ...c, ids };
      }),
    });
  },
};
