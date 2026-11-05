import { test, expect } from "@playwright/test";
import { coverBoxes, expectOneHeight, expectUndistorted } from "../helpers";

// Mock-data mode (the default `npm run dev`): favourites and exhibitions live in this browser.

test("mock mode: hero and archive covers keep their proportions and rows hang level", async ({ page }) => {
  await page.goto("/");
  expectUndistorted(await coverBoxes(page));
  await page.goto("/archive");
  const boxes = await coverBoxes(page, "figure.art-hover img.art");
  expectUndistorted(boxes);
  const rows = new Map<number, number[]>();
  for (const b of boxes) rows.set(b.top, [...(rows.get(b.top) ?? []), b.h]);
  const full = [...rows].filter(([, hs]) => hs.length >= 2);
  expect(full.length).toBeGreaterThan(1);
  for (const [top, hs] of full) expectOneHeight(hs, `row at ${top}px`);
});

test("mock mode: a saved cover and a reordered exhibition survive a reload", async ({ page }) => {
  await page.goto("/archive");
  // The save button only takes the pointer while its card is hovered.
  const card = page.locator("figure.art-hover").first();
  await card.hover();
  await card.getByRole("button", { name: /즐겨찾기에 저장$/ }).click();
  await expect(card.getByRole("button", { name: /즐겨찾기에서 제거$/ })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.locator("figure.art-hover").first().getByRole("button", { name: /즐겨찾기에서 제거$/ })).toHaveAttribute("aria-pressed", "true");

  await page.goto("/collections");
  await page.getByLabel("Title a new exhibition").fill("Mock room");
  await page.getByRole("button", { name: "Open room" }).click();
  await expect(page.getByRole("link", { name: "Mock room" })).toBeVisible();

  // Hang two covers from their viewing rooms.
  for (const i of [0, 1]) {
    await page.goto("/archive");
    await page.locator("figure.art-hover a").nth(i).click();
    await expect(page).toHaveURL(/\/artwork\//);
    await page.getByRole("button", { name: /Exhibit · 전시에 추가/ }).click();
    await page.getByRole("dialog", { name: "Add to exhibition" }).getByRole("button", { name: "Mock room" }).click();
    await expect(page.getByRole("dialog", { name: "Add to exhibition" }).getByRole("button", { name: "Mock room" })).toHaveAttribute("aria-pressed", "true");
  }

  await page.goto("/collections");
  await page.getByRole("link", { name: "Mock room" }).click();
  await expect(page.getByRole("heading", { name: "Mock room" })).toBeVisible();
  const firstTitle = page.locator("ol li").first().locator("p.font-semibold");
  const before = await firstTitle.textContent();
  await page.locator("ol li").first().getByRole("button", { name: /^Move .* later$/ }).click();
  await expect(firstTitle).not.toHaveText(before!);
  await page.reload();
  await expect(firstTitle).not.toHaveText(before!);
});
