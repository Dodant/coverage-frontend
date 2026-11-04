import { CollectionRoom } from "./CollectionRoom";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <CollectionRoom id={(await params).id} />;
}
