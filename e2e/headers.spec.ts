import { test, expect } from "@playwright/test";

// Signed-in actions (like, visibility, remove) must not be reachable from a framing page.
test("pages refuse to be framed and are served with hardening headers", async ({ request }) => {
  const h = (await request.get("/")).headers();
  expect(h["content-security-policy"] ?? "").toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});
