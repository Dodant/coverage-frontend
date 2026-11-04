import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ARTWORKS, catNo, getArtwork, indexOf, related } from "@/lib/artworks";
import { ArtworkViewer } from "@/components/ArtworkViewer";

export function generateStaticParams() {
  return ARTWORKS.map((a) => ({ id: a.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const a = getArtwork((await params).id);
  return a ? { title: `${a.title} — ${a.credit}`, description: `${a.title} 표지 · ${a.imprint} ${a.year ?? ""}` } : {};
}

export default async function ArtworkPage({ params }: { params: Promise<{ id: string }> }) {
  const a = getArtwork((await params).id);
  if (!a) notFound();
  const i = indexOf(a.id);
  const prev = ARTWORKS[(i - 1 + ARTWORKS.length) % ARTWORKS.length];
  const next = ARTWORKS[(i + 1) % ARTWORKS.length];
  return <ArtworkViewer a={a} prev={prev} next={next} related={related(a, 8)} no={catNo(a)} />;
}
