import { notFound } from "next/navigation";
import { isUuid } from "@/lib/api/adapt";
import { USE_API } from "@/lib/api/config";
import { CollectionRoom } from "./CollectionRoom";
import { CollectionRoomApi } from "./CollectionRoomApi";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (USE_API && !isUuid(id)) notFound();
  return USE_API ? <CollectionRoomApi id={id} /> : <CollectionRoom id={id} />;
}
