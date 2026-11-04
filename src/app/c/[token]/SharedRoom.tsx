"use client";

import { Room } from "@/app/collections/[id]/CollectionRoomApi";
import { useSession } from "@/lib/api/session";
import type { CollectionResponse } from "@/lib/api/types";

export function SharedRoom({ c }: { c: CollectionResponse }) {
  const session = useSession();
  // The owner opening their own share link sees the view-only room too; editing lives at /collections/{id}.
  return <Room c={c} editable={false} shared={session?.user.id !== c.ownerId} />;
}
