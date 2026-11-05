import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { USE_API } from "@/lib/api/config";
import { CollectionsIndexApi } from "./CollectionsIndexApi";

// Mock-data screen behind the literal env check (not USE_API): webpack folds it at build time and drops the
// dead branch with its import, so the bundled dataset never ships with the API-mode page.
const CollectionsIndex: React.ComponentType = process.env.NEXT_PUBLIC_DATA_SOURCE === "api" ? () => null : dynamic(() => import("./CollectionsIndex").then((m) => m.CollectionsIndex));

export const metadata: Metadata = { title: "Private Exhibitions" };

export default function CollectionsPage() {
  return USE_API ? <CollectionsIndexApi /> : <CollectionsIndex />;
}
