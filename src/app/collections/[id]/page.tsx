import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { isUuid } from "@/lib/api/adapt";
import { USE_API } from "@/lib/api/config";
import { CollectionRoomApi } from "./CollectionRoomApi";

// Mock-data screen behind the literal env check (not USE_API): webpack folds it at build time and drops the
// dead branch with its import, so the bundled dataset never ships with the API-mode page.
const CollectionRoom: React.ComponentType<{ id: string }> = process.env.NEXT_PUBLIC_DATA_SOURCE === "api" ? () => null : dynamic(() => import("./CollectionRoom").then((m) => m.CollectionRoom));

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (USE_API && !isUuid(id)) notFound();
  return USE_API ? <CollectionRoomApi id={id} /> : <CollectionRoom id={id} />;
}
