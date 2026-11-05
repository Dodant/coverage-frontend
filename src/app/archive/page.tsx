import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { Suspense } from "react";
import { USE_API } from "@/lib/api/config";
import { ArchiveExplorerApi } from "./ArchiveExplorerApi";

// Mock-data screen behind the literal env check (not USE_API): webpack folds it at build time and drops the
// dead branch with its import, so the bundled dataset never ships with the API-mode page.
const ArchiveExplorer: React.ComponentType = process.env.NEXT_PUBLIC_DATA_SOURCE === "api" ? () => null : dynamic(() => import("./ArchiveExplorer").then((m) => m.ArchiveExplorer));

export const metadata: Metadata = { title: "Archive", description: "Browse every cover in COVERAGE by genre, colour, year and edition." };

export default function ArchivePage() {
  return <Suspense>{USE_API ? <ArchiveExplorerApi /> : <ArchiveExplorer />}</Suspense>;
}
