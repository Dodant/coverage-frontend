import type { Metadata } from "next";
import { Suspense } from "react";
import { ArchiveExplorer } from "./ArchiveExplorer";

export const metadata: Metadata = { title: "Archive", description: "Browse every cover in COVERAGE by genre, colour, year and edition." };

export default function ArchivePage() {
  return (
    <Suspense>
      <ArchiveExplorer />
    </Suspense>
  );
}
