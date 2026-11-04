import type { Metadata } from "next";
import { USE_API } from "@/lib/api/config";
import { CollectionsIndex } from "./CollectionsIndex";
import { CollectionsIndexApi } from "./CollectionsIndexApi";

export const metadata: Metadata = { title: "Private Exhibitions" };

export default function CollectionsPage() {
  return USE_API ? <CollectionsIndexApi /> : <CollectionsIndex />;
}
