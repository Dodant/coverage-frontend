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
