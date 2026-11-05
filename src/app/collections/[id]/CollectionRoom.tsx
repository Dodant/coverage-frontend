"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGroup, motion } from "motion/react";
import { useEffect, useState } from "react";
import { ARTWORKS, BY_ID } from "@/lib/mockData";
import { actions, useStore } from "@/lib/store";
import { CollectionGallery, type CollectionView } from "@/components/CollectionGallery";
import { AuroraBackground } from "@/components/AuroraBackground";
import { EASE_OUT } from "@/components/motion";

export function CollectionRoom({ id }: { id: string }) {
  const router = useRouter();
  const { collections } = useStore();
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<CollectionView>("gallery");
  const [naming, setNaming] = useState(false);
  const c = collections.find((x) => x.id === id);
  const [draft, setDraft] = useState("");
  useEffect(() => setHydrated(true), []);
  useEffect(() => { try { const v = localStorage.getItem("coverage:view") as CollectionView | null; if (v) setView(v); } catch {} }, []);
  const choose = (v: CollectionView) => { setView(v); try { localStorage.setItem("coverage:view", v); } catch {} };

  if (!hydrated) return <div className="min-h-[60vh]" />;
  if (!c) {
    return (
      <div className="wrap flex min-h-[70vh] flex-col items-start justify-center pt-24">
        <p className="serif-i text-[clamp(2rem,5vw,4rem)]">This room has closed.</p>
        <p className="kr mt-2 text-ash">전시를 찾을 수 없습니다 — 다른 브라우저에서 만든 전시일 수 있습니다.</p>
        <Link href="/collections" className="label mt-6 underline underline-offset-4">All exhibitions →</Link>
      </div>
    );
  }
  const works = [...new Set(c.ids)].map((x) => BY_ID.get(x)).filter(Boolean) as typeof ARTWORKS;
  const lead = works[0];
  const vars = lead ? ({ "--a1": lead.aurora[0], "--a2": lead.aurora[1], "--a3": works[1]?.aurora[0] ?? lead.aurora[2] } as React.CSSProperties) : undefined;

  return (
    <>
      <section className="relative isolate overflow-hidden pb-16 pt-28 md:pt-32">
        <AuroraBackground preset="reactive" style={vars} grain={0.28} fade />
        <div className="wrap relative z-[2]">
          <div className="flex items-center justify-between">
            <Link href="/collections" className="label hover:underline">← All exhibitions</Link>
            <p className="label">Private Exhibition · {works.length} works</p>
          </div>
          {naming ? (
            <form className="mt-10 flex items-end gap-3" onSubmit={(e) => { e.preventDefault(); actions.renameCollection(c.id, draft); setNaming(false); }}>
              <label htmlFor="room-name" className="sr-only">Exhibition title</label>
              <input id="room-name" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setNaming(false)} className="display kr w-full border-b border-ink bg-transparent text-[length:var(--fs-display)] leading-none outline-none" />
              <button type="submit" className="label h-11 bg-ink px-4 text-museum">Save</button>
            </form>
          ) : (
            <motion.h1 initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.9, ease: EASE_OUT }} className="display kr mt-10 text-[length:var(--fs-display)] leading-[0.9] tracking-[-0.055em] balance">
              {c.name}
            </motion.h1>
          )}
          <div className="mt-10 grid grid-cols-12 gap-x-[var(--gutter)] gap-y-6">
            <label className="col-span-12 md:col-span-6">
              <span className="label text-ink/70">Curator’s note · 전시 서문</span>
              <textarea
                value={c.note}
                onChange={(e) => actions.setNote(c.id, e.target.value)}
                rows={3}
                placeholder="이 전시를 한 문장으로 소개해 보세요…"
                className="kr mt-2 w-full resize-none border-b border-ink/40 bg-transparent text-[17px] leading-relaxed outline-none placeholder:text-ink/40 focus:border-ink"
              />
            </label>
            <div className="col-span-12 flex flex-wrap items-end gap-3 md:col-span-5 md:col-start-8 md:justify-end">
              <LayoutGroup>
                <div role="radiogroup" aria-label="Exhibition view" className="flex rounded-full border border-ink p-1">
                  {(["gallery", "shelf", "salon"] as CollectionView[]).map((v) => (
                    <button key={v} role="radio" aria-checked={view === v} onClick={() => choose(v)} className={`label relative h-9 rounded-full px-4 ${view === v ? "text-museum" : ""}`}>
                      {view === v && <motion.span layoutId="view-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ duration: 0.4, ease: EASE_OUT }} />}
                      <span className="relative">{{ gallery: "Wall", shelf: "Shelf", salon: "Salon" }[v]}</span>
                    </button>
                  ))}
                </div>
              </LayoutGroup>
              <button type="button" className="label h-11 rounded-full px-4 hover:bg-ink/10" onClick={() => { setDraft(c.name); setNaming(true); }}>Rename</button>
              <button type="button" className="label h-11 rounded-full px-4 hover:bg-coral" onClick={() => { if (window.confirm(`Delete “${c.name}”?`)) { actions.deleteCollection(c.id); router.push("/collections"); } }}>Delete</button>
            </div>
          </div>
        </div>
      </section>
      <section className="wrap pb-[var(--section-y)] pt-10">
        {works.length ? (
          <CollectionGallery works={works} view={view} onRemove={(x) => actions.toggleInCollection(c.id, x)} onMove={(x, d) => actions.moveInCollection(c.id, x, d)} />
        ) : (
          <div className="border border-dashed border-ink/30 py-24 text-center">
            <p className="serif-i text-[clamp(1.8rem,4vw,3rem)]">Bare walls, waiting.</p>
            <p className="kr mt-2 text-ash">아카이브의 작품 페이지에서 ‘전시에 추가’를 눌러 이 방을 채우세요.</p>
            <Link href="/archive" className="label mt-6 inline-block underline underline-offset-4">Browse the archive →</Link>
          </div>
        )}
      </section>
    </>
  );
}
