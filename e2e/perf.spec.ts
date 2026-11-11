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

// fetchpriority is zero-sum: only the largest hero cover asks for it, and phones skip the covers they never show.
test("home: one high-priority hero cover; covers hidden on phones are not fetched there", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator("#hero-title").locator("xpath=ancestor::section[1]").locator("img.art");
  await expect(hero).toHaveCount(5);
  await expect(page.locator('img[fetchpriority="high"]')).toHaveCount(1);

  await page.setViewportSize({ width: 390, height: 844 });
  const hidden: string[] = [];
  for (const img of await hero.all()) if (!(await img.isVisible())) hidden.push(await img.getAttribute("src") ?? "");
  expect(hidden).toHaveLength(2);
  const mobile = await page.context().newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  const fetched: string[] = [];
  mobile.on("request", (r) => { if (r.resourceType() === "image") fetched.push(new URL(r.url()).pathname); });
  await mobile.goto("/");
  await mobile.waitForLoadState("networkidle");
  for (const s of hidden) expect(fetched).not.toContain(new URL(s, page.url()).pathname);
});
