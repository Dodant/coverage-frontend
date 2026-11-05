import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

test("no single font file over 500 KB is loaded on the home page", async ({ page }) => {
  const sizes: number[] = [];
  page.on("response", async (r) => {
    if (!/\.woff2(\?|$)/.test(r.url())) return;
    try { sizes.push((await r.body()).length); } catch { /* aborted */ }
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(sizes.length).toBeGreaterThan(0);
  for (const s of sizes) expect(s).toBeLessThan(500_000);
});

// API mode: the bundled Changbi mock set must not reach the browser.
test("client JS does not embed the mock artworks dataset", async ({ page }) => {
  const marker: string = JSON.parse(readFileSync(path.join(__dirname, "..", "src", "data", "artworks.json"), "utf8"))[0].title;
  const hits: string[] = [];
  page.on("response", async (r) => {
    if (!(r.headers()["content-type"] ?? "").includes("javascript")) return;
    try { if ((await r.text()).includes(marker)) hits.push(r.url()); } catch { /* aborted */ }
  });
  await page.goto("/archive");
  await page.waitForLoadState("networkidle");
  expect(hits).toEqual([]);
});
