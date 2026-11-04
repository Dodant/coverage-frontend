import { USE_API } from "@/lib/api/config";
import { CollectionRoom } from "./CollectionRoom";
import { CollectionRoomApi } from "./CollectionRoomApi";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return USE_API ? <CollectionRoomApi id={id} /> : <CollectionRoom id={id} />;
}
