import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

// The mock API advertises cover files from public/covers, and every proportion check waits for a real image,
// so a missing cover set would only show up as 15-second timeouts. Say so up front instead.
export default function globalSetup() {
  const dir = path.join(__dirname, "..", "public", "covers");
  const ok = existsSync(dir) && readdirSync(dir).some((f) => f.endsWith("-640.webp"));
  if (!ok) throw new Error("public/covers is empty — run `npm run covers` (needs ../changbi-press/covers) before `npm run e2e`.");
}
