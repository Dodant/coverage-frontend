import { ARTWORKS, BY_ID, EXHIBITION_IDS, type Artwork } from "@/lib/artworks";
import { Hero } from "@/components/home/Hero";
import { ExhibitionSection } from "@/components/ExhibitionSection";
import { ArchivePreview } from "@/components/home/ArchivePreview";
import { ColorWorld } from "@/components/home/ColorWorld";
import { Discoveries } from "@/components/home/Discoveries";
import { PrivateExhibitions } from "@/components/home/PrivateExhibitions";
import { ArtBeyond } from "@/components/home/ArtBeyond";

function heroCovers(): Artwork[] {
  const used = new Set(EXHIBITION_IDS);
  const order = ["blue", "red", "yellow", "cyan", "orange", "green"];
  const out: Artwork[] = [];
  for (const f of order) {
    const a = ARTWORKS.filter((x) => x.family === f && !used.has(x.id) && ["fiction", "poetry", "picture", "ya"].includes(x.genre))
      .sort((p, q) => q.sat - p.sat)[1];
    if (a) out.push(a);
  }
  return out;
}

export default function Home() {
  const works = EXHIBITION_IDS.map((id) => BY_ID.get(id)!);
  return (
    <>
      <Hero covers={heroCovers()} />
      <ExhibitionSection
        id="exhibition"
        number="01"
        kicker="Featured Exhibition — 기획전"
        title={[{ text: "Saturated." }, { text: "A study in", className: "serif-i font-normal tracking-[-0.03em] md:pl-[1.1em]" }, { text: "fearless colour", className: "md:pl-[0.4em]" }]}
        intro={
          <>
            <p>채도는 표지가 서가에서 소리를 지르는 방식입니다. 이 방에는 아카이브에서 가장 채도 높은 일곱 점의 시집·소설·그림책 표지를 걸었습니다.</p>
            <p className="mt-4 text-ink/60">Seven covers chosen by the archive itself — ranked by the saturation of their dominant hue, then hung as a single wall.</p>
          </>
        }
        aside={
          <dl className="label grid grid-cols-2 gap-4 text-ash">
            <div><dt className="text-ink">Curated by</dt><dd>The palette</dd></div>
            <div><dt className="text-ink">Method</dt><dd>Chroma × area</dd></div>
            <div><dt className="text-ink">On view</dt><dd>Permanent</dd></div>
            <div><dt className="text-ink">Room</dt><dd>Ground floor</dd></div>
          </dl>
        }
        works={works}
      />
      <ArchivePreview />
      <ColorWorld />
      <Discoveries />
      <PrivateExhibitions />
      <ArtBeyond />
    </>
  );
}
