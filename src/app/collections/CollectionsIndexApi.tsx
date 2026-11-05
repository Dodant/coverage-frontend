"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { CollectionFan } from "@/components/CollectionGallery";
import { EditorialHeading } from "@/components/EditorialHeading";
import { AuroraBackground } from "@/components/AuroraBackground";
import { EASE_OUT } from "@/components/motion";
import { ApiError } from "@/lib/api/client";
import { createCollection, deleteCollection, getCollection, myCollections, publicCollections, updateCollection } from "@/lib/api/endpoints";
import { useSession } from "@/lib/api/session";
import { useCollectionWorks } from "@/lib/api/collectionWorks";
import type { CollectionResponse, CollectionSummaryResponse, CollectionVisibility } from "@/lib/api/types";

export const VISIBILITY: Record<CollectionVisibility, { en: string; kr: string }> = {
  PRIVATE: { en: "Private", kr: "나만 보기" },
  LINK_ONLY: { en: "Link only", kr: "링크가 있는 사람" },
  PUBLIC: { en: "Public", kr: "모두에게 공개" },
};

const msg = (e: unknown) => (e instanceof ApiError ? e.message : "연결할 수 없습니다. 잠시 뒤 다시 시도해 주세요.");

/** A room's fanned preview: summaries carry no items, so each room is fetched on its own. */
function RoomFan({ id }: { id: string }) {
  const [c, setC] = useState<CollectionResponse | null | "failed">(null);
  useEffect(() => { getCollection(id).then(setC).catch(() => setC("failed")); }, [id]);
  const works = useCollectionWorks(c && c !== "failed" ? c.items : undefined, 5);
  // A room whose fetch failed is not "empty" — leave the slot blank rather than claim it is.
  if (c === "failed") return <div className="h-56 md:h-64" aria-hidden="true" />;
  return <CollectionFan works={works ?? []} href={`/collections/${id}`} />;
}

export function CollectionsIndexApi() {
  const session = useSession();
  const [hydrated, setHydrated] = useState(false);
  const [mine, setMine] = useState<CollectionSummaryResponse[] | null>(null);
  const [open, setOpen] = useState<CollectionSummaryResponse[] | null>(null);
  const [openError, setOpenError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  useEffect(() => setHydrated(true), []);

  const reload = useCallback(() => {
    if (!session) { setMine([]); return; }
    myCollections().then((p) => setMine(p.content)).catch((e) => { setMine([]); setError(msg(e)); });
  }, [session]);
  useEffect(() => { if (hydrated) reload(); }, [hydrated, reload]);
  const loadOpen = useCallback(() => {
    setOpenError(false); setOpen(null);
    publicCollections(0, 12).then((p) => setOpen(p.content)).catch(() => { setOpen([]); setOpenError(true); });
  }, []);
  useEffect(() => { loadOpen(); }, [loadOpen]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true); setError(null);
    try { await createCollection(name.trim()); setName(""); reload(); } catch (err) { setError(msg(err)); } finally { setBusy(false); }
  };
  const rename = async (id: string) => {
    if (!draft.trim()) return;
    try { await updateCollection(id, { name: draft.trim() }); setEditing(null); reload(); } catch (err) { setError(msg(err)); }
  };
  const remove = async (id: string) => {
    try { await deleteCollection(id); setConfirm(null); setMine((m) => m?.filter((c) => c.id !== id) ?? null); } catch (err) { setError(msg(err)); }
  };

  return (
    <>
      <section className="relative isolate overflow-hidden pb-20 pt-28 md:pt-32">
        <AuroraBackground preset="ember" grain={0.28} fade />
        <div className="wrap relative z-[2]">
          <p className="label mb-6">Private Exhibitions — 나의 전시</p>
          <EditorialHeading
            as="h1"
            trigger="mount"
            lines={[{ text: "Your" }, { text: "Exhibitions", className: "serif-i font-normal tracking-[-0.035em] md:pl-[0.6em]" }]}
            className="display text-[length:var(--fs-mega)] leading-[0.82]"
          />
          <div className="mt-12 grid grid-cols-12 gap-x-[var(--gutter)] gap-y-8">
            <p className="kr col-span-12 text-[15px] leading-[1.75] text-ink/80 md:col-span-5">
              표지를 모아 이름을 붙이면 하나의 전시가 됩니다. 전시는 계정에 저장되며, 공개하거나 링크로만 나눌 수도 있습니다.
            </p>
            {hydrated && session ? (
              <form className="col-span-12 flex items-end gap-3 md:col-span-5 md:col-start-8" onSubmit={create}>
                <label className="flex-1">
                  <span className="label text-ink/70">Title a new exhibition</span>
                  <input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="e.g. 푸른 시간, Night Typography…" className="kr mt-1 h-12 w-full border-b border-ink bg-transparent text-xl outline-none placeholder:text-ink/40" />
                </label>
                <button type="submit" className="h-12 rounded-full bg-ink px-6 text-sm font-medium text-museum transition-colors hover:bg-violet disabled:opacity-40" disabled={!name.trim() || busy}>{busy ? "Opening…" : "Open room"}</button>
              </form>
            ) : hydrated ? (
              <div className="col-span-12 flex items-end md:col-span-5 md:col-start-8">
                <Link href="/login?next=/collections" className="h-12 rounded-full bg-ink px-6 text-sm font-medium leading-[3rem] text-museum hover:bg-violet">Sign in to curate</Link>
              </div>
            ) : null}
          </div>
          {error && <p role="alert" className="kr mt-6 text-sm text-coral">{error}</p>}
        </div>
      </section>

      {session && (
        <section className="wrap py-16" aria-labelledby="rooms-title">
          <div className="flex items-end justify-between border-t border-ink pt-4">
            <h2 id="rooms-title" className="label">Rooms · {String(mine?.length ?? 0).padStart(2, "0")}</h2>
            <p className="label text-ash">Saved to {session.user.displayName}</p>
          </div>
          {mine === null ? (
            <p className="label py-20 text-center text-ash" aria-busy="true">Unlocking the galleries…</p>
          ) : mine.length === 0 ? (
            <div className="py-20 text-center">
              <p className="serif-i text-[clamp(2rem,4.5vw,3.6rem)] leading-tight">The galleries are empty.<br />Hang the first cover.</p>
              <Link href="/archive" className="label mt-6 inline-block underline underline-offset-4">Browse the archive →</Link>
            </div>
          ) : (
            <ul className="mt-6">
              <AnimatePresence initial={false}>
                {mine.map((c, i) => (
                  <motion.li
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.5, ease: EASE_OUT }}
                    className="grid grid-cols-12 items-end gap-x-[var(--gutter)] gap-y-4 border-b border-ink/20 py-8"
                  >
                    <span className="label col-span-12 text-ash md:col-span-1">Room {String(i + 1).padStart(2, "0")}</span>
                    <div className="col-span-12 md:col-span-6">
                      {editing === c.id ? (
                        <form onSubmit={(e) => { e.preventDefault(); rename(c.id); }} className="flex items-end gap-3">
                          <label className="sr-only" htmlFor={`rn-${c.id}`}>Rename exhibition</label>
                          <input id={`rn-${c.id}`} autoFocus maxLength={100} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setEditing(null)} className="display kr w-full border-b border-ink bg-transparent text-[clamp(2rem,5vw,4.5rem)] leading-none outline-none" />
                          <button type="submit" className="label h-10 bg-ink px-3 text-museum">Save</button>
                        </form>
                      ) : (
                        <Link href={`/collections/${c.id}`} className="group block">
                          <p className="display kr text-[clamp(2rem,5vw,4.5rem)] leading-[0.95] tracking-[-0.05em] transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-2">{c.name}</p>
                        </Link>
                      )}
                      <div className="label mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-ash">
                        <span>{c.itemCount} works</span>
                        <span>{VISIBILITY[c.visibility].en}</span>
                        <span>Opened {new Date(c.createdAt).toLocaleDateString("ko-KR")}</span>
                        <button type="button" className="underline-offset-4 hover:text-ink hover:underline" onClick={() => { setEditing(c.id); setDraft(c.name); }}>Rename</button>
                        {confirm === c.id ? (
                          <span className="flex items-center gap-2 text-ink">
                            Delete this room?
                            <button type="button" className="rounded-full bg-coral px-2 py-1" onClick={() => remove(c.id)}>Delete</button>
                            <button type="button" className="underline" onClick={() => setConfirm(null)}>Keep</button>
                          </span>
                        ) : (
                          <button type="button" className="underline-offset-4 hover:text-coral hover:underline" onClick={() => setConfirm(c.id)}>Delete</button>
                        )}
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-4 md:col-start-9"><RoomFan id={c.id} /></div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>
      )}

      <section className="wrap pb-[var(--section-y)] pt-8" aria-labelledby="open-title">
        <div className="flex items-end justify-between border-t border-ink pt-4">
          <h2 id="open-title" className="display text-[length:var(--fs-h1)] leading-none">Open <span className="serif-i font-normal">exhibitions</span></h2>
          <p className="label text-ash">공개 전시</p>
        </div>
        {open === null ? (
          <p className="label py-12 text-ash" aria-busy="true">Loading…</p>
        ) : openError ? (
          <p className="kr py-12 text-ash">공개 전시를 불러오지 못했습니다. <button type="button" onClick={loadOpen} className="underline underline-offset-4">다시 시도</button></p>
        ) : open.length === 0 ? (
          <p className="kr py-12 text-ash">아직 공개된 전시가 없습니다.</p>
        ) : (
          <ul className="mt-6 grid gap-x-[var(--gutter)] sm:grid-cols-2 lg:grid-cols-3">
            {open.map((c) => (
              <li key={c.id} className="border-b border-ink/20 py-6">
                <Link href={session ? `/collections/${c.id}` : `/login?next=/collections/${c.id}`} className="group block">
                  <p className="display kr text-[clamp(1.6rem,3vw,2.6rem)] leading-[0.95] tracking-[-0.045em] group-hover:underline group-hover:decoration-1 group-hover:underline-offset-[6px]">{c.name}</p>
                  {c.description && <p className="kr mt-2 line-clamp-2 text-sm text-ink/70">{c.description}</p>}
                  <p className="label mt-3 text-ash">{c.ownerName} · {c.itemCount} works{session ? "" : " · sign in to visit"}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
