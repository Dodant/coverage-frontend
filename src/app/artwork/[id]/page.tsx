import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ARTWORKS, catNo, getArtwork, indexOf, related } from "@/lib/mockData";
import { USE_API } from "@/lib/api/config";
import { loadRelated, loadWork } from "@/lib/api/works";
import { ArtworkViewer } from "@/components/ArtworkViewer";

// Mock data is pre-rendered; live data is rendered on demand (and cached briefly by fetch).
export function generateStaticParams() {
  return USE_API ? [] : ARTWORKS.map((a) => ({ id: a.id }));
}

async function find(id: string) {
  return USE_API ? loadWork(id) : getArtwork(id) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const a = await find((await params).id).catch(() => null);
  return a ? { title: `${a.title}${a.credit ? ` — ${a.credit}` : ""}`, description: `${a.title} 표지 · ${a.imprint} ${a.year ?? ""}` } : {};
}

export default async function ArtworkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await find(id);
  if (!a) notFound();
  if (USE_API) {
    const rel = await loadRelated(a, 8);
    return <ArtworkViewer a={a} related={rel} no={a.remote?.kind === "TRANSLATED" ? "Translation" : "Original"} />;
  }
  const i = indexOf(a.id);
  const prev = ARTWORKS[(i - 1 + ARTWORKS.length) % ARTWORKS.length];
  const next = ARTWORKS[(i + 1) % ARTWORKS.length];
  return <ArtworkViewer a={a} prev={prev} next={next} related={related(a, 8)} no={catNo(a)} />;
}
