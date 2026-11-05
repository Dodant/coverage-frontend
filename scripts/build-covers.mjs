// Builds public/covers/{id}-640.webp and {id}-1400.webp from the Changbi press-kit originals.
// Run: npm run covers              (only covers that are not there yet)
//      npm run covers -- --force   (rebuild everything)
// Source: ../changbi-press/covers (override with COVERS_SRC). Each data/changbi-meta.json entry maps to the
// file named `{id}` or `{id}_*`; the match is confirmed by width × height so near-duplicate exports can't mix.
// Width is capped, never enlarged, so the 1400 variant of a smaller original keeps its own size and proportions.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = process.env.COVERS_SRC ?? path.join(root, "../changbi-press/covers");
const out = path.join(root, "public/covers");
const force = process.argv.includes("--force");
const WIDTHS = [640, 1400];

const meta = JSON.parse(fs.readFileSync(path.join(root, "data/changbi-meta.json"), "utf8"));
const files = fs.readdirSync(src);
fs.mkdirSync(out, { recursive: true });

let built = 0, present = 0;
const missing = [];
for (const m of meta) {
  const targets = WIDTHS.map((w) => path.join(out, `${m.id}-${w}.webp`));
  if (!force && targets.every((t) => fs.existsSync(t))) { present++; continue; }
  const candidates = files.filter((f) => f === m.id || f.startsWith(`${m.id}_`));
  let file = null;
  for (const f of candidates) {
    const { width, height } = await sharp(path.join(src, f)).metadata();
    if (width === m.width && height === m.height) { file = f; break; }
  }
  if (!file) { missing.push(`${m.id} ${m.width}×${m.height} — candidates: ${candidates.join(", ") || "none"}`); continue; }
  const image = sharp(path.join(src, file)); // CMYK press files come out as sRGB (sharp's default output space)
  for (const [i, width] of WIDTHS.entries()) {
    await image.clone().resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toFile(targets[i]);
  }
  built++;
}
console.log(`covers: ${built} built, ${present} already present, ${missing.length} unmatched`);
for (const m of missing) console.log("  unmatched:", m);
if (missing.length) process.exitCode = 1;
