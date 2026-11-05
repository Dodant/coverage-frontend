"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ARTWORKS, BY_ID } from "@/lib/mockData";
import { actions, useStore } from "@/lib/store";
import { CollectionFan } from "@/components/CollectionGallery";
import { ArtworkGrid } from "@/components/ArtworkGrid";
import { EditorialHeading } from "@/components/EditorialHeading";
import { AuroraBackground } from "@/components/AuroraBackground";
import { EASE_OUT } from "@/components/motion";

export function CollectionsIndex() {
  const { collections, favorites } = useStore();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const favWorks = favorites.map((id) => BY_ID.get(id)).filter(Boolean) as typeof ARTWORKS;

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
              표지를 모아 이름을 붙이면 하나의 전시가 됩니다. 이 브라우저에만 저장되는 개인 전시실이며, 언제든 이름을 바꾸거나 순서를 다시 걸 수 있습니다.
            </p>
            <form
              className="col-span-12 flex items-end gap-3 md:col-span-5 md:col-start-8"
              onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; actions.createCollection(name); setName(""); }}
            >
              <label className="flex-1">
                <span className="label text-ink/70">Title a new exhibition</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 푸른 시간, Night Typography…" className="kr mt-1 h-12 w-full border-b border-ink bg-transparent text-xl outline-none placeholder:text-ink/40" />
              </label>
              <button type="submit" className="h-12 rounded-full bg-ink px-6 text-sm font-medium text-museum transition-colors hover:bg-violet disabled:opacity-40" disabled={!name.trim()}>Open room</button>
            </form>
          </div>
        </div>
      </section>

      <section className="wrap py-16" aria-labelledby="rooms-title">
        <div className="flex items-end justify-between border-t border-ink pt-4">
          <h2 id="rooms-title" className="label">Rooms · {String(collections.length).padStart(2, "0")}</h2>
          <p className="label text-ash">Stored in this browser</p>
        </div>
        {collections.length === 0 ? (
          <div className="py-20 text-center">
            <p className="serif-i text-[clamp(2rem,4.5vw,3.6rem)] leading-tight">The galleries are empty.<br />Hang the first cover.</p>
            <Link href="/archive" className="label mt-6 inline-block underline underline-offset-4">Browse the archive →</Link>
          </div>
        ) : (
          <ul className="mt-6">
            <AnimatePresence initial={false}>
              {collections.map((c, i) => {
                const works = [...new Set(c.ids)].map((id) => BY_ID.get(id)).filter(Boolean) as typeof ARTWORKS;
                return (
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
                        <form onSubmit={(e) => { e.preventDefault(); actions.renameCollection(c.id, draft); setEditing(null); }} className="flex items-end gap-3">
                          <label className="sr-only" htmlFor={`rn-${c.id}`}>Rename exhibition</label>
                          <input id={`rn-${c.id}`} autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setEditing(null)} className="display kr w-full border-b border-ink bg-transparent text-[clamp(2rem,5vw,4.5rem)] leading-none outline-none" />
                          <button type="submit" className="label h-10 bg-ink px-3 text-museum">Save</button>
                        </form>
                      ) : (
                        <Link href={`/collections/${c.id}`} className="group block">
                          <p className="display kr text-[clamp(2rem,5vw,4.5rem)] leading-[0.95] tracking-[-0.05em] transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-2">{c.name}</p>
                        </Link>
                      )}
                      <div className="label mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-ash">
                        <span>{c.ids.length} works</span>
                        <span>Opened {new Date(c.createdAt).toLocaleDateString("ko-KR")}</span>
                        <button type="button" className="underline-offset-4 hover:text-ink hover:underline" onClick={() => { setEditing(c.id); setDraft(c.name); }}>Rename</button>
                        {confirm === c.id ? (
                          <span className="flex items-center gap-2 text-ink">
                            Delete this room?
                            <button type="button" className="rounded-full bg-coral px-2 py-1" onClick={() => { actions.deleteCollection(c.id); setConfirm(null); }}>Delete</button>
                            <button type="button" className="underline" onClick={() => setConfirm(null)}>Keep</button>
                          </span>
                        ) : (
                          <button type="button" className="underline-offset-4 hover:text-coral hover:underline" onClick={() => setConfirm(c.id)}>Delete</button>
                        )}
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-4 md:col-start-9"><CollectionFan works={works} href={`/collections/${c.id}`} /></div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </section>

      <section id="favorites" className="wrap scroll-mt-24 pb-[var(--section-y)]" aria-labelledby="fav-title">
        <div className="flex items-end justify-between border-t border-ink pt-4">
          <h2 id="fav-title" className="display text-[length:var(--fs-h1)] leading-none">Saved <span className="serif-i font-normal">covers</span></h2>
          <p className="label text-ash">{favorites.length} works · 즐겨찾기</p>
        </div>
        <div className="mt-10">
          {favWorks.length ? <ArtworkGrid works={favWorks} /> : <p className="kr py-12 text-ash">하트를 눌러 저장한 표지가 이곳에 모입니다.</p>}
        </div>
      </section>
    </>
  );
}
