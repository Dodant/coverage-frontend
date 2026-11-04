import type { Metadata } from "next";
import { CollectionsIndex } from "./CollectionsIndex";

export const metadata: Metadata = { title: "Private Exhibitions" };

export default function CollectionsPage() {
  return <CollectionsIndex />;
}
