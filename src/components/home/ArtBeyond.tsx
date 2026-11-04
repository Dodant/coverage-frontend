import { AuroraBackground } from "../AuroraBackground";
import { EditorialHeading, Reveal } from "../EditorialHeading";

export function ArtBeyond() {
  return (
    <section aria-labelledby="beyond-title" className="relative isolate overflow-hidden py-[calc(var(--section-y)*1.2)] text-snow">
      <AuroraBackground preset="nocturne" grain={0.34} />
      <div className="wrap relative z-[2]">
        <div className="grid grid-cols-12 gap-x-[var(--gutter)] border-t border-snow/60 pt-4">
          <p className="label col-span-6 md:col-span-3">06 — Interlude</p>
          <p className="label col-span-6 text-right md:col-span-3 md:col-start-10">An essay in four lines</p>
        </div>
        <h2 id="beyond-title" className="sr-only">The Art Beyond the Story</h2>
        <div className="mt-12 md:mt-20">
          <EditorialHeading as="p" lines={["The Art"]} className="display text-[length:var(--fs-mega)] leading-[0.8]" />
          <EditorialHeading as="p" lines={["Beyond"]} delay={0.08} className="display outline-text text-[length:var(--fs-mega)] leading-[0.8] md:ml-[18%]" />
          <EditorialHeading as="p" lines={["the"]} delay={0.16} className="serif-i text-[length:var(--fs-mega)] leading-[0.8] md:ml-[8%]" />
          <EditorialHeading as="p" lines={["Story."]} delay={0.24} className="display text-[length:var(--fs-mega)] leading-[0.8] md:ml-[36%]" />
        </div>
        <div className="mt-16 grid grid-cols-12 gap-x-[var(--gutter)] gap-y-10 md:mt-24">
          <Reveal className="col-span-12 md:col-span-4 md:col-start-2">
            <p className="serif-i text-[clamp(1.5rem,2.4vw,2.2rem)] leading-[1.12]">A cover is read before a single word is. It is the first sentence, written in colour, type and image.</p>
          </Reveal>
          <Reveal delay={0.1} className="kr col-span-12 text-[15px] leading-[1.85] text-snow/80 md:col-span-4 md:col-start-8">
            <p>표지는 책을 펼치기 전에 먼저 읽힙니다. 한 권의 이야기를 하나의 이미지로 응축하는 일 — 그것은 번역이자 해석이고, 때로는 이야기와 전혀 다른 곳으로 걸어가는 독립된 창작입니다.</p>
            <p className="mt-4">COVERAGE는 표지를 판매를 위한 포장에서 꺼내어, 벽에 걸린 한 점의 작품으로 다시 바라봅니다. 디자이너와 일러스트레이터의 이름을 적고, 색을 기록하고, 서로 다른 시간과 장르의 표지들을 같은 방에 세웁니다.</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
