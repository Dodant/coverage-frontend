"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BY_ID, pick, type Artwork } from "@/lib/artworks";
import { useCatalog } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { ArtworkImage } from "../ArtworkImage";
import { EditorialHeading, Reveal } from "../EditorialHeading";

function Fan({ works }: { works: Artwork[] }) {
  return (
    <div className="relative mx-auto flex h-[15rem] items-end justify-center md:h-[19rem]">
      {works.slice(0, 4).map((a, i, arr) => {
        const mid = (arr.length - 1) / 2;
        return (
          <div
            key={a.id}
            className="absolute bottom-0 h-[88%] transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:[transform:translateX(var(--tx))_rotate(var(--r2))]"
            style={{
              aspectRatio: `${a.w} / ${a.h}`,
              transform: `translateX(${(i - mid) * 26}%) rotate(${(i - mid) * 5}deg)`,
              "--tx": `${(i - mid) * 44}%`,
              "--r2": `${(i - mid) * 8}deg`,
              zIndex: i,
              transformOrigin: "50% 120%",
            } as React.CSSProperties}
          >
            <ArtworkImage a={a} sizes="200px" />
          </div>
        );
      })}
    </div>
  );
}

export function PrivateExhibitions() {
  const { collections, favorites } = useStore();
  const { works: ARTWORKS, live } = useCatalog();
  const samples = useMemo(
    () => [
      { name: "Blue Hours", kr: "푸른 시간", works: ARTWORKS.filter((a) => a.family === "blue").slice(0, 4) },
      { name: "Small Hands", kr: "작은 손들", works: ARTWORKS.filter((a) => a.genre === "picture").slice(0, 4) },
      { name: "Verse in Saffron", kr: "치자빛 시", works: pick(ARTWORKS.filter((a) => a.genre === "poetry" && ["yellow", "orange"].includes(a.family)), 4, 3) },
    ],
    [ARTWORKS],
  );
  const mine = live ? [] : collections.filter((c) => c.ids.length).slice(0, 3).map((c) => ({ name: c.name, kr: `${c.ids.length} works`, works: c.ids.map((id) => BY_ID.get(id)!).filter(Boolean), id: c.id }));
  const usable = samples.filter((x) => x.works.length >= 2);
  const fallback = usable.length ? usable : [{ name: "Just Arrived", kr: "새로 들어온 표지", works: ARTWORKS.slice(0, 4) }];
  const shown = mine.length ? mine : fallback;

  return (
    <section id="exhibitions" aria-labelledby="exh-title" className="relative py-[var(--section-y)]">
      <div className="wrap">
        <div className="grid grid-cols-12 gap-x-[var(--gutter)] border-t border-ink pt-4">
          <p className="label col-span-6 md:col-span-3">05 — Private Exhibitions</p>
          <p className="label col-span-6 text-right md:col-span-3 md:col-start-10">{mine.length ? "Your rooms" : "Sample rooms"} · {favorites.length} saved</p>
        </div>
        <div className="mt-8 grid grid-cols-12 items-end gap-x-[var(--gutter)]">
          <EditorialHeading
            as="h2"
            lines={[{ text: "Curate" }, { text: "your own", className: "md:pl-[1.6em]" }, { text: "rooms.", className: "serif-i font-normal md:pl-[0.4em]" }]}
            className="display col-span-12 text-[length:var(--fs-display)] leading-[0.86] md:col-span-7"
          />
          <span id="exh-title" className="sr-only">Private Exhibitions — curate your own rooms</span>
          <div className="col-span-12 mt-8 md:col-span-4 md:col-start-9 md:mt-0">
            <p className="kr text-[15px] leading-[1.75] text-ink/80">
              마음에 드는 표지를 저장하고, 나만의 전시실을 꾸리세요. 컬렉션은 북마크 폴더가 아니라 한 편의 전시입니다 — 제목을 붙이고, 순서를 정하고, 벽과 서가 두 방식으로 감상합니다.
            </p>
            <Link href="/collections" className="mt-6 inline-flex h-12 items-center gap-3 rounded-full bg-ink px-6 text-sm font-medium text-museum transition-colors hover:bg-violet">
              {mine.length ? "Open your exhibitions" : "Start an exhibition"} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <ul className="mt-20 grid gap-12 md:grid-cols-3 md:gap-[var(--gutter)]">
          {shown.map((c, i) => (
            <Reveal as="li" key={c.name} delay={i * 0.1} className={i === 1 ? "md:mt-20" : ""}>
              <Link href={"id" in c ? `/collections/${c.id}` : "/collections"} className="group block">
                <Fan works={c.works} />
                <div className="mt-8 flex items-baseline justify-between border-t border-ink/30 pt-3">
                  <p className="display text-[clamp(1.6rem,2.6vw,2.4rem)] leading-none">{c.name}</p>
                  <p className="kr label normal-case text-ash">{c.kr}</p>
                </div>
                <p className="label mt-2 text-ash">Room {String(i + 1).padStart(2, "0")} · {c.works.length} works</p>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
