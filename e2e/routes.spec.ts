import { test, expect } from "@playwright/test";
import { API } from "./helpers";

// Route params become API path segments; anything that is not a UUID is a 404 before any request is built.
// The mock keeps a request log so the test can tell the guard's 404 from a backend 404.
for (const path of ["/artwork/o-%2E%2E%2Fadmin%2Fsearch%2Freindex", "/collections/%2E%2E%2Fpublic", "/c/%2E%2E%2Fmy"]) {
  test(`${decodeURIComponent(path)} is not found and never reaches the backend`, async ({ page, request }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(404);
    const seen: string[] = await (await request.get(`${API}/api/__requests`)).json();
    expect(seen.filter((p) => /%2E%2E|\.\.|%2F|admin/i.test(p))).toEqual([]);
  });
}
