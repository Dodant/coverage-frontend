"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { ARTWORKS, GENRES, fmtDate, pick } from "@/lib/artworks";
import { AuroraBackground } from "../AuroraBackground";
import { ArtworkCard } from "../ArtworkCard";
import { EditorialHeading } from "../EditorialHeading";
import { Magnetic } from "../Magnetic";
import { EASE_OUT } from "../motion";

const ROT = [-7, 2, 8];

export function Discoveries() {
  const reduce = useReducedMotion();
  const [seed, setSeed] = useState(11);
  const [draws, setDraws] = useState(0);
  const hand = pick(ARTWORKS, 3, seed);

  return (
    <section id="discover" aria-labelledby="discover-title" className="relative isolate overflow-hidden py-[var(--section-y)]">
      <AuroraBackground fade preset="lagoon" grain={0.3} />
      <div className="wrap relative z-[2]">
        <div className="grid grid-cols-12 gap-x-[var(--gutter)] border-t border-ink pt-4">
          <p className="label col-span-6 md:col-span-3">04 — Unexpected Discoveries</p>
          <p className="label col-span-6 text-right md:col-span-3 md:col-start-10" aria-live="polite">Draw Nº {String(draws + 1).padStart(3, "0")}</p>
        </div>
        <div className="mt-8 grid grid-cols-12 gap-x-[var(--gutter)]">
          <div className="col-span-12 md:col-span-5">
            <EditorialHeading
              as="h2"
              lines={[{ text: "Leave it" }, { text: "to chance.", className: "serif-i font-normal tracking-[-0.03em]" }]}
              className="display text-[length:var(--fs-display)] leading-[0.86]"
            />
            <span id="discover-title" className="sr-only">Unexpected Discoveries — leave it to chance</span>
            <p className="kr mt-8 max-w-[28em] text-[15px] leading-[1.75] text-ink/80">
              검색으로는 닿지 않는 표지가 있습니다. 아카이브에서 세 점을 무작위로 뽑아, 서로 아무 관계 없는 표지들이 한 벽에 나란히 걸릴 때 생기는 뜻밖의 대화를 감상해 보세요.
            </p>
            <div className="mt-10">
              <Magnetic>
                <button
                  type="button"
                  onClick={() => { setSeed(Math.floor(Math.random() * 1e9)); setDraws((d) => d + 1); }}
                  className="group relative flex size-40 items-center justify-center rounded-full bg-ink text-museum transition-transform duration-300 hover:scale-[1.04] active:scale-95 md:size-48"
                >
                  <span className="text-center">
                    <span className="serif-i block text-[2rem] leading-none">Draw</span>
                    <span className="label mt-2 block">three covers</span>
                    <span className="kr mt-1 block text-[11px] opacity-70">우연히 펼치기</span>
                  </span>
                  <span aria-hidden="true" className="absolute inset-[-10px] rounded-full border border-ink/30 transition-transform duration-500 group-hover:scale-110" />
                </button>
              </Magnetic>
            </div>
          </div>
          <ul className="col-span-12 mt-16 flex items-start justify-center gap-4 md:col-span-7 md:mt-0 md:gap-10">
            <AnimatePresence mode="popLayout" initial={false}>
              {hand.map((a, i) => (
                <motion.li
                  key={`${seed}-${a.id}`}
                  className="flex-none"
                  initial={reduce ? false : { opacity: 0, y: -120, rotate: ROT[i] * 3, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, rotate: ROT[i], scale: 1, transition: { duration: 0.8, ease: EASE_OUT, delay: i * 0.09 } }}
                  exit={{ opacity: 0, y: 80, rotate: ROT[i] * -2, transition: { duration: 0.35, ease: [0.65, 0, 0.35, 1] } }}
                >
                  <ArtworkCard a={a} caption="none" save={false} sizes="(max-width:768px) 30vw, 18vw" rowHeight="clamp(8rem, 21vw, 19rem)" />
                  <div className="mt-4 hidden md:block" style={{ transform: `rotate(${-ROT[i]}deg)` }}>
                    <p className="kr text-[13px] font-semibold">{a.title}</p>
                    <p className="label mt-1 text-ink/60">{GENRES[a.genre].en} · {fmtDate(a)}</p>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      </div>
    </section>
  );
}
