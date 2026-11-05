import { test, expect } from "@playwright/test";
import { API, coverBoxes, expectOneHeight, expectUndistorted, signInAs } from "./helpers";

const DEMO = { email: "demo@coverage.test", password: "coverage123" };

test("exhibition views hang covers at one height even when the API omits cover sizes", async ({ page, request }) => {
  // The real backend has no width/height for 86 of 251 covers; the mock always has them, so strip them here.
  await page.route("**/api/covers/*", async (route) => {
    const res = await route.fetch();
    const c = await res.json();
    await route.fulfill({ response: res, json: { ...c, width: null, height: null } });
  });
  const auth = await signInAs(page, request, DEMO);
  const mine = await (await request.get(`${API}/api/collections/my`, { headers: { Authorization: `Bearer ${auth.accessToken}` } })).json();
  const room = mine.content.find((c: { itemCount: number }) => c.itemCount >= 4);
  expect(room, "the demo account has a room with several covers").toBeTruthy();
  await page.goto(`/collections/${room.id}`);
  await expect(page.getByRole("heading", { name: room.name })).toBeVisible();

  for (const [view, scope] of [["Wall", "ol img.art"], ["Shelf", "ul img.art"], ["Salon", "ul img.art"]] as const) {
    await page.getByRole("radio", { name: view }).click();
    const boxes = await coverBoxes(page, scope);
    expectUndistorted(boxes);
    expectOneHeight(boxes.map((b) => b.h), view);
  }
});
