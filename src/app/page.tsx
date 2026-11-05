import { type Artwork } from "@/lib/artworks";
import { ARTWORKS } from "@/lib/mockData";
import { USE_API } from "@/lib/api/config";
import { loadLatestWorks } from "@/lib/api/works";
import { CatalogProvider } from "@/lib/catalog";
import { Hero } from "@/components/home/Hero";
import { ExhibitionSection } from "@/components/ExhibitionSection";
import { ArchivePreview } from "@/components/home/ArchivePreview";
import { ColorWorld } from "@/components/home/ColorWorld";
import { Discoveries } from "@/components/home/Discoveries";
import { PrivateExhibitions } from "@/components/home/PrivateExhibitions";
import { ArtBeyond } from "@/components/home/ArtBeyond";

// Live data: re-render the home page at most every 5 minutes.
export const revalidate = 300;

/** Seven covers with the most saturated dominant colour — the "Saturated" exhibition. */
function exhibitionPick(list: Artwork[]) {
  const pool = list.filter((a) => (["poetry", "fiction", "picture"].includes(a.genre) || USE_API) && a.sat > 0.35);
  const top = [...pool].sort((a, b) => b.sat - a.sat).slice(0, 7);
  return top.length >= 4 ? top : [...list].sort((a, b) => b.sat - a.sat).slice(0, 7);
}

function heroCovers(list: Artwork[], used: Set<string>): Artwork[] {
  const order = ["blue", "red", "yellow", "cyan", "orange", "green"];
  const out: Artwork[] = [];
  for (const f of order) {
    const cands = list.filter((x) => x.family === f && !used.has(x.id) && (USE_API || ["fiction", "poetry", "picture", "ya"].includes(x.genre))).sort((p, q) => q.sat - p.sat);
    const a = cands[USE_API ? 0 : 1];
    if (a) { out.push(a); used.add(a.id); }
  }
  for (const a of list) { if (out.length >= 5) break; if (!used.has(a.id)) { out.push(a); used.add(a.id); } }
  return out;
}

export default async function Home() {
  const list = USE_API ? await loadLatestWorks(48).catch(() => [] as Artwork[]) : ARTWORKS;
  const works = exhibitionPick(list);
  const hero = heroCovers(list, new Set(works.map((w) => w.id)));
  if (USE_API && list.length === 0) {
    return (
      <div className="wrap flex min-h-[80vh] flex-col justify-center pt-24">
        <p className="label text-ash">Live archive</p>
        <p className="serif-i mt-4 text-[clamp(2.4rem,6vw,5rem)] leading-[1]">The galleries are dark.</p>
        <p className="kr mt-4 max-w-xl text-ash">백엔드에서 표지를 불러오지 못했습니다. coverage-backend가 실행 중인지, COVERAGE_API_ORIGIN이 맞는지 확인하세요. 아직 등록된 책이 없을 수도 있습니다.</p>
      </div>
    );
  }
  return (
    <CatalogProvider works={list} live={USE_API}>
      <Hero covers={hero} />
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
    </CatalogProvider>
  );
}
