import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { USE_API } from "@/lib/api/config";
import { ApiError } from "@/lib/api/client";
import { isUuid } from "@/lib/api/adapt";
import { getSharedCollection } from "@/lib/api/endpoints";
import { SharedRoom } from "./SharedRoom";

async function load(token: string) {
  if (!USE_API || !isUuid(token)) return null;
  try { return await getSharedCollection(token); } catch (e) { if (e instanceof ApiError && (e.isNotFound || e.status === 400)) return null; throw e; }
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const c = await load((await params).token).catch(() => null);
  return c ? { title: `${c.name} — ${c.ownerName}`, description: c.description ?? undefined } : { title: "Shared exhibition" };
}

/** A PUBLIC or LINK_ONLY exhibition, open to anyone holding its share link. */
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const c = await load((await params).token);
  if (!c) notFound();
  return <SharedRoom c={c} />;
}
