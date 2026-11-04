import type { Metadata } from "next";
import { Suspense } from "react";
import { USE_API } from "@/lib/api/config";
import { ArchiveExplorer } from "./ArchiveExplorer";
import { ArchiveExplorerApi } from "./ArchiveExplorerApi";

export const metadata: Metadata = { title: "Archive", description: "Browse every cover in COVERAGE by genre, colour, year and edition." };

export default function ArchivePage() {
  return <Suspense>{USE_API ? <ArchiveExplorerApi /> : <ArchiveExplorer />}</Suspense>;
}
