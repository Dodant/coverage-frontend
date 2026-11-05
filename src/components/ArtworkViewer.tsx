"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Artwork, CoverImage, Edition } from "@/lib/artworks";
import { FAMILIES, GENRES, LANG_LABEL, auroraVars, editionLangs, fmtDate, ownEdition } from "@/lib/artworks";
import { auroraFrom, familyOf } from "@/lib/color";
import { markViewReady } from "@/lib/transition";
import { AuroraBackground } from "./AuroraBackground";
import { ArtworkImage } from "./ArtworkImage";
import { ArtworkCard } from "./ArtworkCard";
import { SaveButton } from "./SaveButton";
import { CollectionPicker } from "./CollectionPicker";
import { InspectOverlay } from "./InspectOverlay";
import { EASE_OUT } from "./motion";
import { EditionsRail, editionLabel } from "./EditionsRail";
import { EditionPlaceholder } from "./EditionPlaceholder";
import { CompareOverlay } from "./CompareOverlay";

type Props = { a: Artwork; prev?: Artwork | null; next?: Artwork | null; related: Artwork[]; no: string };

/**
 * The artwork as seen through one edition and one of its cover images. For live data each
 * edition has its own covers; in mock data only the work's own edition has an image.
 */
function viewOf(a: Artwork, own: Edition, sel: Edition, img: CoverImage | null): Artwork | null {
  if (sel === own && (!img || img.coverId === a.remote?.coverId || !a.remote)) return a;
  if (!img || !(img.thumb || img.full)) return null;
  const key = img.dominantColor ?? a.key;
  return {
    ...a,
    w: img.w ?? 2,
    h: img.h ?? 3,
    ratioUnknown: !(img.w && img.h),
    key,
    family: img.dominantColor ? familyOf(img.dominantColor) : a.family,
    aurora: img.dominantColor ? auroraFrom(img.dominantColor) : a.aurora,
    palette: img.dominantColor ? [img.dominantColor] : a.palette,
    remote: a.remote && {
      ...a.remote,
      kind: sel.bookKind ?? a.remote.kind,
      bookId: sel.bookId ?? a.remote.bookId,
      coverId: img.coverId,
      thumb: img.thumb,
      full: img.full,
      likeCount: img.likeCount,
    },
  };
}

function Row({ k, v }: { k: string; v?: React.ReactNode }) {
  if (v === null || v === undefined || v === "") return null;
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 border-t border-ink/15 py-2.5">
      <dt className="label pt-[3px] text-ink/60">{k}</dt>
      <dd className="kr text-[14px] leading-snug">{v}</dd>
    </div>
  );
}

export function ArtworkViewer({ a, prev = null, next = null, related, no }: Props) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [inspect, setInspect] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const hero = useRef<HTMLImageElement>(null);
  const fam = FAMILIES.find((f) => f.id === a.family)!;
  const own = ownEdition(a);
  const archivedKey = own.key;
  const [edKey, setEdKey] = useState(archivedKey);
  const [compare, setCompare] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const sel = a.editions.find((e) => e.key === edKey) ?? own;
  const multi = a.editions.length > 1;
  // Which image of the selected edition: a front variant id, or "back".
  const [variant, setVariant] = useState<string | null>(null);
  useEffect(() => setVariant(null), [edKey]);
  const covers = [...(sel.variants ?? []), ...(sel.back ? [sel.back] : [])];
  const img = (variant && covers.find((c) => c.coverId === variant)) || sel.image || null;
  const view = viewOf(a, own, sel, img);
  const [heroRatio, setHeroRatio] = useState<number | null>(null);
  useEffect(() => setHeroRatio(view && !view.ratioUnknown ? view.w / view.h : null), [view?.w, view?.h, view?.ratioUnknown, view?.remote?.coverId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Edition selection lives in the URL (?edition=) so a specific edition can be linked.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const k = q.get("edition");
    if (q.get("compare") === "1" && a.editions.length > 1) setCompare(true);
    setEdKey(k && a.editions.some((e) => e.key === k) ? k : archivedKey);
  }, [a.id, a.editions, archivedKey]);
  const selectEdition = (k: string) => {
    setEdKey(k);
    const u = new URL(window.location.href);
    if (k === archivedKey) u.searchParams.delete("edition"); else u.searchParams.set("edition", k);
    window.history.replaceState(null, "", u);
  };
  const notice = (t: string) => { setToast(t); window.setTimeout(() => setToast(null), 2600); };

  useLayoutEffect(() => {
    // Let the shared-element transition capture the new state once the hero has decoded.
    const img = hero.current;
    if (!img) return markViewReady();
    if (img.complete) markViewReady();
    else img.decode().then(markViewReady, markViewReady);
  }, [a.id]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (inspect || compare || (e.target as HTMLElement).closest("input,textarea,select,[role=dialog]")) return;
      if (e.key === "ArrowLeft" && prev) router.push(`/artwork/${prev.id}`, { scroll: false });
      if (e.key === "ArrowRight" && next) router.push(`/artwork/${next.id}`, { scroll: false });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [router, prev, next, inspect, compare]);

  const note = [
    a.year ? `${a.year}년${a.month ? ` ${a.month}월` : ""} ${a.imprint}에서 펴낸` : `${a.imprint}에서 펴낸`,
    `${GENRES[a.genre].kr}${a.series ? ` 〈${a.series}〉${a.volume ? ` ${a.volume}권` : ""}` : ""}의 표지.`,
    a.translated && a.originalTitle ? `원제 『${a.originalTitle}』.` : "",
    `대표색은 ${fam.kr}(${fam.en}) 계열의 ${a.key.toUpperCase()}이며, 화면의 약 ${Math.round(a.light * 100)}% 명도로 읽힙니다.`,
    a.format ? `판형 ${a.format}${a.pages ? `, ${a.pages}쪽` : ""}.` : "",
  ].filter(Boolean).join(" ");

  return (
    <article className="relative">
      <section className="relative isolate min-h-[100svh] overflow-hidden" style={auroraVars(view ?? a)}>
        <AuroraBackground preset="reactive" grain={0.28} />
        <div className="wrap relative z-[2] pb-16 pt-20 md:pt-24">
          <nav aria-label="Artwork navigation" className="flex items-center justify-between gap-4">
            <Link href="/archive" className="label inline-flex items-center gap-2 hover:underline"><span aria-hidden="true">←</span> Archive</Link>
            <p className="label hidden md:block">{no} · Viewing Room</p>
            <div className="flex items-center gap-1">
              {prev && <Link href={`/artwork/${prev.id}`} scroll={false} className="label inline-flex h-10 items-center rounded-full px-3 hover:bg-ink/10" aria-label={`Previous: ${prev.title}`}>← Prev</Link>}
              {next && <Link href={`/artwork/${next.id}`} scroll={false} className="label inline-flex h-10 items-center rounded-full px-3 hover:bg-ink/10" aria-label={`Next: ${next.title}`}>Next →</Link>}
            </div>
          </nav>

          <div className="mt-8 grid grid-cols-12 items-center gap-x-[var(--gutter)] gap-y-12 md:mt-6">
            <div className="col-span-12 flex justify-center md:col-span-7 md:min-h-[70vh] md:items-center">
              {!view ? (
                <div className="flex flex-col items-start gap-4" style={{ width: "min(100%, calc(70vh * 0.6667), 36rem)" }}>
                  <EditionPlaceholder e={sel} workTitle={a.title} className="w-full bg-museum/40" />
                  <button type="button" onClick={() => notice("표지 제보는 준비 중입니다 · Cover submissions are coming soon.")} className="label inline-flex h-10 items-center rounded-full border border-ink px-4 hover:bg-ink hover:text-museum">＋ Contribute this cover</button>
                </div>
              ) : (
              <button
                type="button"
                onClick={() => setInspect(true)}
                className="group relative block cursor-zoom-in"
                aria-label={`Inspect ${a.title} at full size`}
                style={{ width: `min(100%, calc(78vh * ${heroRatio ?? 2 / 3}), 40rem)` }}
              >
                <div className="art-frame">
                  <ArtworkImage
                    key={view.remote?.coverId ?? a.id}
                    a={view}
                    onLoad={(e) => { const i = e.currentTarget; if (view.ratioUnknown && i.naturalWidth) setHeroRatio(i.naturalWidth / i.naturalHeight); }}
                    large
                    priority
                    sizes="(max-width:768px) 90vw, 45vw"
                    imgRef={hero}
                    data-vt-hero=""
                    style={{ viewTransitionName: "artwork-active", boxShadow: "0 2px 3px rgb(0 0 0 / .08), 0 30px 60px -20px rgb(0 0 0 / .45), 0 80px 120px -60px rgb(0 0 0 / .35)" }}
                  />
                </div>
                <span className="label absolute -bottom-8 left-0 opacity-0 transition-opacity group-hover:opacity-100">⤢ Inspect</span>
              </button>
              )}
            </div>

            <motion.div
              key={a.id}
              className="col-span-12 md:col-span-5"
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.15 }}
            >
              <p className="label">{no} — {GENRES[a.genre].en} / {GENRES[a.genre].kr}{multi ? ` · Work of ${a.editions.length} editions · ${editionLangs(a).join(" · ")}` : ""}</p>
              <h1 className="kr mt-4 text-[clamp(2.2rem,4.6vw,4.6rem)] font-bold leading-[1.02] tracking-[-0.045em] balance">{a.title}</h1>
              {a.subtitle && <p className="kr mt-3 text-lg leading-snug text-ink/70">{a.subtitle}</p>}
              <p className="kr mt-4 text-[17px] text-ink/85">{a.credit}</p>

              {multi && (
                <div className="mt-7 flex items-baseline justify-between border-t border-ink pt-3">
                  <p className="label">Now viewing · {sel.kind === "original" ? "Original edition 원서" : `${LANG_LABEL[sel.lang ?? ""]?.en ?? ""} edition`}</p>
                  <p className="label">{editionLabel(sel)}</p>
                </div>
              )}
              {sel !== own ? (
                <dl className="mt-4 border-b border-ink/15">
                  <Row k="Title 제목" v={sel.title ? <span className="serif-i text-[17px]">{sel.title}</span> : <span className="text-ink/55">원제 미기재 · Not recorded</span>} />
                  <Row k="Language" v={sel.lang ? `${LANG_LABEL[sel.lang]?.en ?? sel.lang} · ${LANG_LABEL[sel.lang]?.kr ?? ""}` : "—"} />
                  <Row k="Country" v={sel.country ?? "—"} />
                  <Row k="Published" v={sel.year ?? "—"} />
                  <Row k="Publisher" v={sel.publisher ?? <span className="text-ink/55">Not recorded</span>} />
                  <Row k="Translator 옮김" v={sel.translator} />
                  <Row k="Cover design" v={img?.credits.length ? img.credits.map((c) => c.name).join(", ") : null} />
                  <Row k="Cover" v={view ? [img?.label, img?.variantType && img.variantType !== "UNKNOWN" ? img.variantType.toLowerCase() : null].filter(Boolean).join(" · ") || "Archived" : <span className="text-ink/55">Not yet archived · 표지 미수집</span>} />
                </dl>
              ) : (
              <dl className="mt-8 border-b border-ink/15">
                <Row k="Author 저자" v={a.authors} />
                <Row k="Illustrator 그림" v={a.illustrators.join(", ") || null} />
                <Row k="Cover design" v={img?.credits.filter((c) => c.role !== "ILLUSTRATION").length ? img.credits.filter((c) => c.role !== "ILLUSTRATION").map((c) => c.name).join(", ") : <span className="text-ink/55">Not recorded · 표지 디자이너 미기재</span>} />
                <Row k="Translator 옮김" v={a.translator} />
                <Row k="Original title" v={a.originalTitle && <span className="serif-i text-[16px]">{a.originalTitle}</span>} />
                <Row k="Publisher" v={a.imprint} />
                <Row k="Published" v={fmtDate(a)} />
                <Row k="Series" v={a.series && `${a.series}${a.volume ? ` · ${a.volume}` : ""}`} />
                <Row k="Language" v={a.translated ? `한국어 (from ${a.language ?? "—"})` : a.language} />
                <Row k="Origin" v={a.country ?? (a.translated ? "—" : null)} />
                <Row k="Format" v={[a.format, a.pages && `${a.pages}p`, a.price && `₩${a.price.toLocaleString("ko-KR")}`].filter(Boolean).join(" · ") || null} />
              </dl>
              )}

              {view && view.palette.length > 0 && (
              <div className="mt-6">
                <p className="label mb-2 text-ink/60">Palette · 색 기록</p>
                <ul className="flex flex-wrap gap-1.5">
                  {view.palette.map((hex, i) => (
                    <li key={hex + i}>
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard?.writeText(hex).catch(() => {}); setCopied(hex); window.setTimeout(() => setCopied(null), 1200); }}
                        className="group flex flex-col items-start"
                        aria-label={`Copy ${hex}`}
                      >
                        <span className="block h-12 w-12 ring-1 ring-black/10 transition-transform duration-200 group-hover:-translate-y-0.5 md:w-14" style={{ background: hex }} />
                        <span className="label mt-1 text-[10px] text-ink/70">{copied === hex ? "copied" : hex.slice(1)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-2">
                {multi && <button type="button" onClick={() => setCompare(true)} className="label inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-museum hover:bg-violet">⇄ Compare {a.editions.length} editions</button>}
                {view && <SaveButton id={a.id} title={a.title} art={view} />}
                {view && <CollectionPicker id={a.id} art={view} />}
                {view && <button type="button" onClick={() => setInspect(true)} className="label inline-flex h-11 items-center gap-2 rounded-full px-4 hover:bg-ink/10">⤢ Inspect</button>}
              </div>
            </motion.div>
          </div>

          <div className="mt-14">
            <EditionsRail a={a} current={sel.key} onSelect={selectEdition} notice={notice} variant={img?.coverId ?? null} onVariant={setVariant} />
          </div>
        </div>
      </section>

      <section className="wrap grid grid-cols-12 gap-x-[var(--gutter)] gap-y-8 py-[calc(var(--section-y)*0.7)]">
        <p className="label col-span-12 md:col-span-3">Archival note<br /><span className="text-ash">기록</span></p>
        <p className="kr col-span-12 text-[clamp(1.15rem,1.8vw,1.6rem)] leading-[1.6] tracking-[-0.01em] md:col-span-7">{note}</p>
      </section>

      {(related.length > 0 || (prev && next)) && <section aria-labelledby="related-title" className="wrap pb-[var(--section-y)]">
        <div className="flex items-end justify-between border-t border-ink pt-4">
          <h2 id="related-title" className="display text-[length:var(--fs-h2)]">In conversation</h2>
          <p className="label text-ash">Related by series, genre & hue</p>
        </div>
        <ul className="mt-10 flex flex-wrap items-start gap-x-4 gap-y-10 md:gap-x-6">
          {related.map((r) => (
            <li key={r.id}><ArtworkCard a={r} sizes="(max-width:768px) 30vw, 11vw" save={false} rowHeight="clamp(9rem, 12vw, 12rem)" /></li>
          ))}
        </ul>

        {prev && next && <nav aria-label="Previous and next artwork" className="mt-[var(--section-y)] grid grid-cols-2 border-t border-ink/30">
          {[{ w: prev, dir: "Previous", arrow: "←" }, { w: next, dir: "Next", arrow: "→" }].map(({ w, dir, arrow }, i) => (
            <Link key={dir} href={`/artwork/${w.id}`} className={`group flex items-center gap-5 py-6 ${i ? "flex-row-reverse border-l border-ink/30 pl-4 text-right" : "pr-4"}`}>
              <div className="w-14 shrink-0 md:w-20"><ArtworkImage a={w} sizes="80px" /></div>
              <div className="min-w-0">
                <p className="label text-ash">{arrow} {dir}</p>
                <p className="kr mt-1 truncate text-[clamp(1rem,2.2vw,2rem)] font-bold tracking-[-0.03em] transition-transform duration-300 group-hover:translate-x-1">{w.title}</p>
              </div>
            </Link>
          ))}
        </nav>}
      </section>}

      <AnimatePresence>{inspect && view && <InspectOverlay a={view} onClose={() => setInspect(false)} />}</AnimatePresence>
      <AnimatePresence>{compare && <CompareOverlay a={a} onClose={() => setCompare(false)} />}</AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.p role="status" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="kr fixed inset-x-0 bottom-6 z-[70] mx-auto w-fit max-w-[90vw] bg-ink px-5 py-3 text-sm text-museum shadow-lg">
            {toast}
          </motion.p>
        )}
      </AnimatePresence>
    </article>
  );
}
