import type { Artwork } from "@/lib/artworks";
import { GENRES, fmtDate } from "@/lib/artworks";
import { ArtworkCard } from "./ArtworkCard";
import { EditorialHeading, Reveal } from "./EditorialHeading";

type Props = {
  id?: string;
  number: string;
  kicker: string;
  title: (string | { text: string; className?: string })[];
  intro: React.ReactNode;
  works: Artwork[];
  aside?: React.ReactNode;
};

// Hand-composed placements (12-col) — a magazine spread, not a card grid.
const PLACE = [
  "col-span-2 md:col-span-4 md:col-start-1 md:row-span-2",
  "md:col-span-2 md:col-start-6 md:mt-[38%]",
  "md:col-span-3 md:col-start-9 md:mt-[4%]",
  "md:col-span-3 md:col-start-5 md:mt-[14%]",
  "md:col-span-2 md:col-start-10 md:mt-[30%]",
  "md:col-span-2 md:col-start-2 md:mt-[12%]",
  "md:col-span-3 md:col-start-7 md:-mt-[4%]",
];

export function MuseumLabel({ a, n }: { a: Artwork; n: number }) {
  return (
    <div className="mt-3 grid grid-cols-[2.2em_1fr] gap-x-2 text-[12px] leading-snug">
      <span className="label pt-[2px] text-ash">{String(n).padStart(2, "0")}</span>
      <div>
        <p className="kr font-semibold tracking-[-0.01em]">{a.title}</p>
        <p className="kr text-ash">{a.credit}</p>
        <p className="label mt-1 text-ash">{GENRES[a.genre].en} · {a.imprint} · {fmtDate(a)}{a.format ? ` · ${a.format}` : ""}</p>
      </div>
    </div>
  );
}

export function ExhibitionSection({ id, number, kicker, title, intro, works, aside }: Props) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="relative py-[var(--section-y)]">
      <div className="wrap">
        <div className="grid grid-cols-12 items-end gap-x-[var(--gutter)] border-t border-ink pt-4">
          <p className="label col-span-6 md:col-span-3">{kicker}</p>
          <p className="label col-span-6 text-right md:col-span-3 md:col-start-10">{works.length} works · Room {number}</p>
        </div>
        <div className="mt-6 grid grid-cols-12 gap-x-[var(--gutter)]">
          <span aria-hidden="true" className="display outline-text col-span-3 text-[clamp(4.5rem,15vw,15rem)] leading-[0.78] text-ink/70 md:col-span-3">{number}</span>
          <div className="col-span-9 md:col-span-8 md:col-start-5">
            <EditorialHeading
              as="h2"
              lines={title}
              className="display text-[length:var(--fs-display)] leading-[0.84]"
            />
            <span id={`${id}-title`} className="sr-only">{title.map((t) => (typeof t === "string" ? t : t.text)).join(" ")}</span>
          </div>
        </div>
        <div className="mt-10 grid grid-cols-12 gap-x-[var(--gutter)] md:mt-14">
          <Reveal className="kr col-span-12 max-w-[34em] text-[15px] leading-[1.75] text-ink/80 md:col-span-4 md:col-start-5">{intro}</Reveal>
          {aside && <div className="col-span-12 mt-6 md:col-span-3 md:col-start-10 md:mt-0">{aside}</div>}
        </div>

        <ol className="mt-16 grid grid-cols-2 items-start gap-x-[var(--gutter)] gap-y-12 md:mt-24 md:grid-cols-12 md:gap-y-6">
          {works.slice(0, 7).map((a, i) => (
            <Reveal as="li" key={a.id} delay={(i % 3) * 0.08} className={PLACE[i] ?? "md:col-span-3"}>
              <ArtworkCard a={a} caption="none" sizes={i === 0 ? "(max-width:768px) 92vw, 40vw" : "(max-width:768px) 45vw, 22vw"} />
              <MuseumLabel a={a} n={i + 1} />
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
