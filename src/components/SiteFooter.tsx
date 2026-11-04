import Link from "next/link";
import { ARTWORKS, YEARS } from "@/lib/artworks";
import { USE_API } from "@/lib/api/config";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-ink/15 pt-16">
      <div className="wrap grid gap-10 pb-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="serif-i text-[clamp(1.8rem,3.4vw,3rem)] leading-[1.02]">Every cover is a world.<br />Walk in slowly.</p>
          <p className="kr mt-4 max-w-sm text-sm leading-relaxed text-ash">표지는 책의 얼굴이자 그 자체로 완결된 하나의 작품입니다. COVERAGE는 표지 디자인을 독립된 시각 예술로 수집하고, 큐레이션하고, 감상하는 실험적 디지털 뮤지엄입니다.</p>
        </div>
        <dl className="label grid grid-cols-2 gap-x-8 gap-y-5 text-ash md:col-span-4 md:col-start-7">
          <div><dt className="text-ink">Holdings</dt><dd>{USE_API ? "Live archive" : `${ARTWORKS.length} works`}</dd></div>
          <div><dt className="text-ink">Span</dt><dd>{USE_API ? "Growing" : `${YEARS[0]}–${YEARS[YEARS.length - 1]}`}</dd></div>
          <div><dt className="text-ink">Source</dt><dd>{USE_API ? <>Member contributions<br />and publishers</> : <>Changbi Publishers<br />press materials</>}</dd></div>
          <div><dt className="text-ink">Edition</dt><dd>Prototype 0.1</dd></div>
        </dl>
        <nav aria-label="Footer" className="label flex flex-col gap-2 md:col-span-2 md:col-start-11">
          <Link href="/archive" className="hover:underline">Archive</Link>
          <Link href="/#color" className="hover:underline">A World of Colour</Link>
          <Link href="/collections" className="hover:underline">Private Exhibitions</Link>
        </nav>
      </div>
      <p className="label wrap relative pb-8 text-ash">
        {USE_API
          ? "Cover artwork © the respective designers, illustrators and publishers. Shown for archival appreciation. Copyright holders can request removal."
          : "Cover artwork © the respective designers, illustrators and Changbi Publishers. Shown for archival appreciation; metadata from publisher press releases."}
      </p>
      <p aria-hidden="true" className="display outline-text translate-y-[0.14em] whitespace-nowrap px-[var(--gutter)] text-[clamp(4.5rem,20.6vw,29rem)] leading-[0.76] text-ink/80">COVERAGE</p>
    </footer>
  );
}
