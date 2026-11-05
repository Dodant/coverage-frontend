import { test, expect } from "@playwright/test";

// Route params become API path segments; anything that is not a UUID is a 404 before any request is built.
for (const path of ["/artwork/o-%2E%2E%2Fadmin%2Fsearch%2Freindex", "/collections/%2E%2E%2Fpublic", "/c/%2E%2E%2Fmy"]) {
  test(`${decodeURIComponent(path)} is not found`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(404);
  });
}
