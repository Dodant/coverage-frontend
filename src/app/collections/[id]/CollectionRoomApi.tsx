"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGroup, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CollectionGallery, type CollectionView } from "@/components/CollectionGallery";
import { AuroraBackground } from "@/components/AuroraBackground";
import { EASE_OUT } from "@/components/motion";
import { ApiError } from "@/lib/api/client";
import { deleteCollection, duplicateCollection, getCollection, removeCollectionItem, updateCollection } from "@/lib/api/endpoints";
import { useSession } from "@/lib/api/session";
import { coverIdOf, useCollectionWorks } from "@/lib/api/collectionWorks";
import type { CollectionResponse, CollectionVisibility } from "@/lib/api/types";
import { VISIBILITY } from "../CollectionsIndexApi";

const msg = (e: unknown) => (e instanceof ApiError ? e.message : "연결할 수 없습니다. 잠시 뒤 다시 시도해 주세요.");

function Closed({ title, note, signIn }: { title: string; note: string; signIn?: string }) {
  return (
    <div className="wrap flex min-h-[70vh] flex-col items-start justify-center pt-24">
      <p className="serif-i text-[clamp(2rem,5vw,4rem)]">{title}</p>
      <p className="kr mt-2 text-ash">{note}</p>
      <div className="mt-6 flex gap-6">
        {signIn && <Link href={`/login?next=${encodeURIComponent(signIn)}`} className="label underline underline-offset-4">Sign in →</Link>}
        <Link href="/collections" className="label underline underline-offset-4">All exhibitions →</Link>
      </div>
    </div>
  );
}

/** Logged-in view of a collection by id: editable by its owner, view-only for anyone else allowed in. */
export function CollectionRoomApi({ id }: { id: string }) {
  const session = useSession();
  const [hydrated, setHydrated] = useState(false);
  const [c, setC] = useState<CollectionResponse | null>(null);
  const [failure, setFailure] = useState<"auth" | "gone" | "private" | "error" | null>(null);
  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (!hydrated) return;
    if (!session) { setFailure("auth"); return; }
    setFailure(null);
    setC(null);
    let alive = true;
    getCollection(id).then((r) => { if (alive) setC(r); }).catch((e) => {
      if (!alive) return;
      if (e instanceof ApiError && e.isAuth) setFailure("auth");
      else if (e instanceof ApiError && e.isNotFound) setFailure("gone");
      else if (e instanceof ApiError && e.status === 400) setFailure("private");
      else setFailure("error");
    });
    return () => { alive = false; };
    // Only the login identity matters here, not token rotation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, id, session?.user.id]);

  if (!hydrated) return <div className="min-h-[60vh]" />;
  if (failure === "auth") return <Closed title="Members only, for now." note="전시실은 로그인한 뒤 볼 수 있습니다. 공유 링크가 있다면 그 링크로 바로 열 수 있어요." signIn={`/collections/${id}`} />;
  if (failure === "gone") return <Closed title="This room has closed." note="전시를 찾을 수 없습니다 — 삭제되었을 수 있습니다." />;
  if (failure === "private") return <Closed title="A private room." note="이 전시는 비공개입니다." />;
  if (failure === "error") return <Closed title="The lights are out." note="전시를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요." />;
  if (!c) return <p className="label flex min-h-[70vh] items-center justify-center text-ash" aria-busy="true">Unlocking the room…</p>;
  return <Room c={c} setC={setC} editable={session?.user.id === c.ownerId} />;
}

/** One exhibition room. Shared by the owner's view, a visitor's view and the share-link page. */
export function Room({ c, setC, editable, shared = false }: { c: CollectionResponse; setC?: (c: CollectionResponse) => void; editable: boolean; shared?: boolean }) {
  const router = useRouter();
  const session = useSession();
  const works = useCollectionWorks(c.items);
  const [view, setView] = useState<CollectionView>("gallery");
  const [naming, setNaming] = useState(false);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState(c.description ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Resync only when another room is shown — a reply to some other edit must not wipe a note being typed.
  useEffect(() => setNote(c.description ?? ""), [c.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { try { const v = localStorage.getItem("coverage:view") as CollectionView | null; if (v) setView(v); } catch {} }, []);
  const choose = (v: CollectionView) => { setView(v); try { localStorage.setItem("coverage:view", v); } catch {} };

  const inflight = useRef(false);
  const run = async (fn: () => Promise<CollectionResponse | void>) => {
    if (inflight.current) return false; // one write at a time: a double click must not duplicate or delete twice
    inflight.current = true;
    setStatus(null);
    try { const r = await fn(); if (r && setC) setC(r); return true; } catch (e) { setStatus(msg(e)); return false; } finally { inflight.current = false; }
  };
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/c/${c.shareToken}` : `/c/${c.shareToken}`;
  const copy = async () => { try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { setStatus(shareUrl); } };

  const lead = works?.[0];
  const vars = lead ? ({ "--a1": lead.aurora[0], "--a2": lead.aurora[1], "--a3": works?.[1]?.aurora[0] ?? lead.aurora[2] } as React.CSSProperties) : undefined;

  return (
    <>
      <section className="relative isolate overflow-hidden pb-16 pt-28 md:pt-32">
        <AuroraBackground preset="reactive" style={vars} grain={0.28} fade />
        <div className="wrap relative z-[2]">
          <div className="flex items-center justify-between gap-4">
            {shared ? <span className="label">Shared exhibition · {c.ownerName}</span> : <Link href="/collections" className="label hover:underline">← All exhibitions</Link>}
            <p className="label">{VISIBILITY[c.visibility].en} · {c.itemCount} works</p>
          </div>
          {naming ? (
            <form className="mt-10 flex items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) run(() => updateCollection(c.id, { name: draft.trim() })).then((ok) => ok && setNaming(false)); }}>
              <label htmlFor="room-name" className="sr-only">Exhibition title</label>
              <input id="room-name" autoFocus maxLength={100} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setNaming(false)} className="display kr w-full border-b border-ink bg-transparent text-[length:var(--fs-display)] leading-none outline-none" />
              <button type="submit" className="label h-11 bg-ink px-4 text-museum">Save</button>
            </form>
          ) : (
            <motion.h1 initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.9, ease: EASE_OUT }} className="display kr mt-10 text-[length:var(--fs-display)] leading-[0.9] tracking-[-0.055em] balance">
              {c.name}
            </motion.h1>
          )}
          {!editable && <p className="label mt-4 text-ash">Curated by {c.ownerName}</p>}
          <div className="mt-10 grid grid-cols-12 gap-x-[var(--gutter)] gap-y-6">
            {editable ? (
              <label className="col-span-12 md:col-span-6">
                <span className="label text-ink/70">Curator’s note · 전시 서문</span>
                <textarea
                  value={note}
                  maxLength={500}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={() => { if (note !== (c.description ?? "")) run(() => updateCollection(c.id, { description: note })); }}
                  rows={3}
                  placeholder="이 전시를 한 문장으로 소개해 보세요…"
                  className="kr mt-2 w-full resize-none border-b border-ink/40 bg-transparent text-[17px] leading-relaxed outline-none placeholder:text-ink/40 focus:border-ink"
                />
              </label>
            ) : c.description ? (
              <p className="kr col-span-12 text-[17px] leading-relaxed text-ink/85 md:col-span-6">{c.description}</p>
            ) : <div className="col-span-12 md:col-span-6" />}
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
              {editable && (
                <>
                  <button type="button" className="label h-11 rounded-full px-4 hover:bg-ink/10" onClick={() => { setDraft(c.name); setNaming(true); }}>Rename</button>
                  <button type="button" className="label h-11 rounded-full px-4 hover:bg-coral" onClick={() => { if (window.confirm(`Delete “${c.name}”?`)) run(() => deleteCollection(c.id)).then((ok) => ok && router.push("/collections")); }}>Delete</button>
                </>
              )}
              {!editable && session && (
                <button type="button" className="label h-11 rounded-full border border-ink px-4 hover:bg-ink hover:text-museum" onClick={() => run(async () => { const copy = await duplicateCollection(c.id); router.push(`/collections/${copy.id}`); })}>
                  Copy to my exhibitions
                </button>
              )}
            </div>
            {editable && (
              <fieldset className="col-span-12 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-ink/15 pt-5">
                <legend className="label float-left mr-4 text-ink/70">Who can visit</legend>
                {(Object.keys(VISIBILITY) as CollectionVisibility[]).map((v) => (
                  <label key={v} className="label flex cursor-pointer items-center gap-2">
                    <input type="radio" name="visibility" checked={c.visibility === v} onChange={() => run(() => updateCollection(c.id, { visibility: v }))} className="accent-[var(--c-ink)]" />
                    {VISIBILITY[v].en} <span className="kr normal-case text-ash">{VISIBILITY[v].kr}</span>
                  </label>
                ))}
                {c.visibility !== "PRIVATE" && (
                  <button type="button" onClick={copy} className="label ml-auto rounded-full border border-ink px-4 py-2 hover:bg-ink hover:text-museum" aria-live="polite">
                    {copied ? "Link copied" : "Copy share link"}
                  </button>
                )}
              </fieldset>
            )}
          </div>
          {status && <p role="alert" className="kr mt-4 break-all text-sm text-coral">{status}</p>}
        </div>
      </section>
      <section className="wrap pb-[var(--section-y)] pt-10">
        {works === null ? (
          <p className="label py-24 text-center text-ash" aria-busy="true">Hanging the covers…</p>
        ) : works.length ? (
          <CollectionGallery works={works} view={view} onRemove={editable ? (x) => { const a = works.find((w) => w.id === x); if (a) run(() => removeCollectionItem(c.id, coverIdOf(a))); } : undefined} />
        ) : (
          <div className="border border-dashed border-ink/30 py-24 text-center">
            <p className="serif-i text-[clamp(1.8rem,4vw,3rem)]">Bare walls, waiting.</p>
            {editable && <p className="kr mt-2 text-ash">아카이브의 작품 페이지에서 ‘전시에 추가’를 눌러 이 방을 채우세요.</p>}
            <Link href="/archive" className="label mt-6 inline-block underline underline-offset-4">Browse the archive →</Link>
          </div>
        )}
      </section>
    </>
  );
}
