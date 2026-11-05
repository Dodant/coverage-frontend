import { test, expect } from "@playwright/test";
import { coverBoxes, expectOneHeight, expectUndistorted, routeIdFor } from "./helpers";

// A work with an original (no cover file) and a Korean translation (Changbi cover).
const WORK = "입속의 새";

test("home: hero covers keep their proportions", async ({ page }) => {
  await page.goto("/");
  expectUndistorted(await coverBoxes(page));
});

test("archive: covers keep their proportions and each row hangs at one height", async ({ page }) => {
  await page.goto("/archive");
  const boxes = await coverBoxes(page, "figure.art-hover img.art");
  expectUndistorted(boxes);
  const rows = new Map<number, number[]>();
  for (const b of boxes) rows.set(b.top, [...(rows.get(b.top) ?? []), b.h]);
  const full = [...rows].filter(([, hs]) => hs.length >= 2); // a trailing row may hold a single cover
  expect(full.length).toBeGreaterThan(1);
  for (const [top, hs] of full) expectOneHeight(hs, `row at ${top}px`);
});

test("archive: hovering a work deals its editions out at the card's height", async ({ page }) => {
  await page.goto("/archive");
  await page.getByRole("searchbox").fill(WORK);
  const card = page.locator("figure.art-hover", { has: page.locator(`img[alt^="${WORK}"]`) }).first();
  await expect(card).toBeVisible();
  // A search hit is a single cover until the work (original + translations) has loaded; only then does hovering fan it out.
  await expect(card).toContainText(/\d+ editions/);
  await card.hover();
  const fan = page.getByRole("dialog", { name: /editions$/ });
  await expect(fan).toBeVisible();
  const cardHeight = await card.locator("img.art").first().evaluate((e) => (e as HTMLElement).offsetHeight);
  const heights = await fan.locator("li > a > img, li > a > div").evaluateAll((els) => els.map((e) => (e as HTMLElement).offsetHeight));
  expectOneHeight([cardHeight, ...heights], "fan");
  await page.keyboard.press("Escape");
  await expect(fan).toBeHidden();
});

test("artwork: Compare hangs every edition at one height; Escape closes it", async ({ page, request }) => {
  await page.goto(`/artwork/${await routeIdFor(request, WORK)}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(WORK);
  await page.getByRole("button", { name: /Compare \d+ editions/ }).click();
  const dialog = page.getByRole("dialog", { name: /^Compare editions/ });
  await expect(dialog).toBeVisible();
  const heights = await dialog.locator("figure > :first-child").evaluateAll((els) => els.map((e) => (e as HTMLElement).offsetHeight));
  expectOneHeight(heights, "compare");
  expectUndistorted(await coverBoxes(page, '[role="dialog"] figure > img'));
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("artwork: Compare keeps the first edition reachable when the row overflows, traps Tab and returns focus", async ({ page, request }) => {
  await page.setViewportSize({ width: 420, height: 800 });
  await page.goto(`/artwork/${await routeIdFor(request, WORK)}`);
  const opener = page.getByRole("button", { name: /Compare \d+ editions/ });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: /^Compare editions/ });
  const first = dialog.locator("figure").first();
  await expect(first).toBeVisible();
  expect((await first.boundingBox())!.x, "the first edition starts inside the scrollable area").toBeGreaterThanOrEqual(0);
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null), "Tab stays inside the dialog").toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("archive: a translated hit is fetched once while works are expanded", async ({ page }) => {
  const urls: string[] = [];
  page.on("request", (r) => { if (/\/api\/books\/translated\/[0-9a-f-]+$/.test(r.url())) urls.push(r.url()); });
  await page.goto("/archive");
  await page.getByRole("searchbox").fill(WORK);
  const card = page.locator("figure.art-hover", { has: page.locator(`img[alt^="${WORK}"]`) }).first();
  await expect(card).toContainText(/\d+ editions/);
  await page.waitForLoadState("networkidle");
  expect(urls.length).toBeGreaterThan(0);
  expect(new Set(urls).size, `duplicate requests: ${urls.join(", ")}`).toBe(urls.length);
});
