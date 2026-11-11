"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Artwork } from "@/lib/artworks";
import { addCollectionItem, allMyCollections, createCollection, getCollection, removeCollectionItem } from "@/lib/api/endpoints";
import type { CollectionItemType, CollectionResponse } from "@/lib/api/types";
import { useSession } from "@/lib/api/session";
import { rememberCover } from "@/lib/api/coverIndex";
import { pool } from "@/lib/api/works";
import { useAnchoredPopover } from "./useAnchoredPopover";

/** "Add to exhibition" for live data: the user's server-side collections. Items are covers. */
export function CollectionPickerApi({ art, className = "" }: { art: Artwork; className?: string }) {
  const router = useRouter();
  const session = useSession();
  const uid = session?.user.id;
  const r = art.remote!;
  const itemType: CollectionItemType = r.kind === "ORIGINAL" ? "ORIGINAL_COVER" : "TRANSLATED_COVER";
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<{ id: string; name: string; has: boolean }[] | null>(null);
  const [name, setName] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pop = useAnchoredPopover(setOpen);
  const note = (t: string) => { setFlash(t); window.setTimeout(() => setFlash(null), 1800); };

  useEffect(() => {
    if (!open || !uid || !r.coverId) return;
    let alive = true;
    (async () => {
      try {
        const rooms = await allMyCollections();
        // Membership needs each collection's items (no "contains" endpoint); six at a time.
        const full = await pool(rooms, 6, (c) => (c.itemCount ? getCollection(c.id).catch(() => null) : Promise.resolve(null)));
        if (alive) setRows(rooms.map((c, i) => ({ id: c.id, name: c.name, has: Boolean(full[i]?.items.some((x) => x.itemId === r.coverId)) })));
      } catch { if (alive) setRows([]); }
    })();
    return () => { alive = false; };
  }, [open, uid, r.coverId]); // a token refresh is not a reason to re-read every room

  const toggle = async (row: { id: string; name: string; has: boolean }) => {
    if (!r.coverId || busy) return;
    setBusy(true);
    try {
      if (row.has) await removeCollectionItem(row.id, r.coverId);
      else { await addCollectionItem(row.id, itemType, r.coverId); rememberCover(r.coverId, art.id, art.title); }
      setRows((rs) => rs?.map((x) => (x.id === row.id ? { ...x, has: !x.has } : x)) ?? null);
      note(row.has ? `Removed from ${row.name}` : `Hung in ${row.name}`);
    } catch { note("실패했습니다 · failed"); }
    finally { setBusy(false); }
  };

  const create = async () => {
    if (!r.coverId || busy) return;
    setBusy(true);
    let c: CollectionResponse | null = null;
    try {
      const made = await createCollection(name.trim() || "Untitled Exhibition");
      c = made;
      setName("");
      await addCollectionItem(made.id, itemType, r.coverId);
      rememberCover(r.coverId, art.id, art.title);
      setRows((rs) => [{ id: made.id, name: made.name, has: true }, ...(rs ?? [])]);
      note(`Opened “${made.name}”`);
    } catch {
      // The room may exist although the cover was not hung in it — list it so a retry does not open another.
      const made = c;
      if (made) { setRows((rs) => [{ id: made.id, name: made.name, has: false }, ...(rs ?? [])]); note(`“${made.name}” opened · cover not added`); }
      else note("실패했습니다 · failed");
    }
    finally { setBusy(false); }
  };

  const count = rows?.filter((x) => x.has).length ?? 0;
  return (
    <div className={`relative ${className}`}>
      <button
        ref={pop.button}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        popoverTarget={session ? pop.id : undefined}
        onClick={() => { if (!session) router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`); }}
        className="label inline-flex h-11 items-center gap-2 rounded-full border border-ink/80 px-5 hover:bg-ink hover:text-museum"
      >
        <span aria-hidden="true">＋</span> Exhibit · 전시에 추가 {count > 0 && <span className="rounded-full bg-lime px-1.5 text-night">{count}</span>}
      </button>
      <AnimatePresence>
        {flash && <motion.p key="flash" role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="label absolute -top-7 left-0 whitespace-nowrap">{flash}</motion.p>}
      </AnimatePresence>
      <div ref={pop.panel} id={pop.id} popover="auto" role="dialog" aria-label="Add to exhibition" className="anchored-pop w-[min(20rem,85vw)] border border-ink bg-museum p-4 text-ink shadow-[0_24px_60px_-20px_rgb(0_0_0/0.35)]">
            <p className="label mb-3 text-ash">Your exhibitions</p>
            {rows === null && <p className="label text-ash">Loading…</p>}
            {rows?.length === 0 && <p className="kr mb-3 text-sm text-ash">아직 전시가 없습니다. 첫 전시를 열어 보세요.</p>}
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {rows?.map((c) => (
                <li key={c.id}>
                  <button type="button" aria-pressed={c.has} disabled={busy} onClick={() => toggle(c)} className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm hover:text-violet disabled:opacity-60">
                    <span className="kr truncate font-medium">{c.name}</span>
                    <span aria-hidden="true" className={`flex size-5 shrink-0 items-center justify-center border ${c.has ? "border-ink bg-ink text-museum" : "border-ink/40"}`}>{c.has ? "✓" : ""}</span>
                  </button>
                </li>
              ))}
            </ul>
            <form className="mt-3 flex gap-2 border-t border-ink/15 pt-3" onSubmit={(e) => { e.preventDefault(); create(); }}>
              <label className="sr-only" htmlFor={`new-col-${art.id}`}>New exhibition name</label>
              <input id={`new-col-${art.id}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="New exhibition…" className="kr h-10 min-w-0 flex-1 border-b border-ink/40 bg-transparent text-sm outline-none focus:border-ink" />
              <button type="submit" disabled={busy} className="label h-10 bg-ink px-3 text-museum disabled:opacity-60">Create</button>
            </form>
      </div>
    </div>
  );
}
