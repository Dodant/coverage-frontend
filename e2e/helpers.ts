import { expect, type APIRequestContext, type Page } from "@playwright/test";

/** The mock backend started by playwright.config.ts. */
export const API = `http://localhost:${process.env.E2E_API_PORT ?? 4110}`;

/** Route id (`o-…` original / `t-…` translation) of the first search hit for `query`. */
export async function routeIdFor(request: APIRequestContext, query: string) {
  const res = await request.get(`${API}/api/search`, { params: { query } });
  expect(res.ok()).toBeTruthy();
  const hit = (await res.json()).items[0];
  expect(hit, `no search hit for "${query}"`).toBeTruthy();
  const [type, uuid] = hit.id.split("_");
  return `${type === "original" ? "o" : "t"}-${uuid}`;
}

/** Waits until every cover image matching `scope` has loaded, then returns their layout boxes. */
export async function coverBoxes(page: Page, scope = "img.art") {
  await expect(page.locator(scope).first()).toBeVisible();
  // Covers below the fold are lazy; make them load so every box is measured against a real file.
  await page.locator(scope).evaluateAll((els) => els.forEach((e) => { (e as HTMLImageElement).loading = "eager"; }));
  await page.waitForFunction((s) => Array.from(document.querySelectorAll<HTMLImageElement>(s)).every((i) => i.complete), scope);
  return page.locator(scope).evaluateAll((els) =>
    (els as HTMLImageElement[]).filter((e) => e.naturalWidth > 0).map((e) => ({
      src: e.currentSrc,
      // Layout size, so transforms (the hero's tilt, hover lifts) don't skew the ratio.
      w: e.offsetWidth, h: e.offsetHeight, nw: e.naturalWidth, nh: e.naturalHeight,
      top: Math.round(e.getBoundingClientRect().top + window.scrollY),
    })),
  );
}

/** Design rule: a cover is never stretched or cropped — its rendered proportions match the file's. */
export function expectUndistorted(boxes: Awaited<ReturnType<typeof coverBoxes>>) {
  expect(boxes.length).toBeGreaterThan(0);
  for (const b of boxes) expect(Math.abs(b.w / b.h - b.nw / b.nh), `${b.src}: rendered ${b.w}×${b.h}, file ${b.nw}×${b.nh}`).toBeLessThan(0.02);
}

/** Design rule: everything hung together shares one height. */
export function expectOneHeight(heights: number[], what: string) {
  expect(heights.length, what).toBeGreaterThanOrEqual(2);
  expect(Math.max(...heights) - Math.min(...heights), `${what}: heights ${heights.join(", ")}`).toBeLessThanOrEqual(1);
}
