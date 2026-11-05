import { test, expect } from "@playwright/test";
import { API, coverBoxes, expectUndistorted, routeIdFor } from "./helpers";

const DEMO = { email: "demo@coverage.test", password: "coverage123" };
const SESSION_KEY = "coverage:session";

test("signup shows the backend's field error on the field", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Name · 이름").fill("E2E");
  await page.getByLabel("Email · 이메일").fill(DEMO.email); // taken → 400 with details.email
  await page.getByLabel("Password · 비밀번호").fill("coverage123");
  await page.getByRole("button", { name: /Create account/ }).click();
  await expect(page.locator("#email-err")).toHaveText("이미 사용 중인 이메일입니다");
  await expect(page).toHaveURL(/\/signup/);
});

test("join, like a cover, hang it in a new exhibition, share the room", async ({ page, context, browser, request }) => {
  await page.goto("/signup");
  await page.getByLabel("Name · 이름").fill("E2E Curator");
  await page.getByLabel("Email · 이메일").fill(`e2e-${Date.now()}@coverage.test`);
  await page.getByLabel("Password · 비밀번호").fill("coverage123");
  await page.getByRole("button", { name: /Create account/ }).click();
  await expect(page.getByRole("link", { name: /^Account — E2E Curator/ })).toBeVisible();

  // Like, and the state survives a reload (status comes from the server).
  await page.goto(`/artwork/${await routeIdFor(request, "입속의 새")}`);
  await page.getByRole("button", { name: /좋아요$/ }).click();
  await expect(page.getByRole("button", { name: /좋아요 취소$/ })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("button", { name: /좋아요 취소$/ })).toHaveAttribute("aria-pressed", "true");

  // A new exhibition from the picker, with this cover hung in it.
  await page.getByRole("button", { name: /Exhibit · 전시에 추가/ }).click();
  const picker = page.getByRole("dialog", { name: "Add to exhibition" });
  await picker.getByPlaceholder("New exhibition…").fill("E2E room");
  await picker.getByRole("button", { name: "Create" }).click();
  await expect(picker.getByRole("button", { name: "E2E room" })).toHaveAttribute("aria-pressed", "true");

  // Open the room, make it link-only, copy the share link.
  const session = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), SESSION_KEY);
  const mine = await (await request.get(`${API}/api/collections/my`, { headers: { Authorization: `Bearer ${session.accessToken}` } })).json();
  const room = mine.content.find((c: { name: string }) => c.name === "E2E room");
  expect(room).toBeTruthy();
  await page.goto(`/collections/${room.id}`);
  await expect(page.getByRole("heading", { name: "E2E room" })).toBeVisible();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("radio", { name: /link/i }).click(); // controlled input: the state lands when PUT /collections/{id} returns
  await page.getByRole("button", { name: "Copy share link" }).click();
  await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
  const shareUrl = await page.evaluate(() => navigator.clipboard.readText());
  expect(shareUrl).toMatch(/\/c\/[0-9a-f-]{36}$/);

  // Anyone holding the link sees the room without signing in.
  const guest = await browser.newContext();
  const guestPage = await guest.newPage();
  await guestPage.goto(shareUrl);
  await expect(guestPage.getByRole("heading", { name: "E2E room" })).toBeVisible();
  expectUndistorted(await coverBoxes(guestPage));
  await guest.close();
});

test("an invalid access token is refreshed once and the request retried", async ({ page, request }) => {
  const auth = await (await request.post(`${API}/api/auth/login`, { data: DEMO })).json();
  await page.goto("/login");
  await page.evaluate(([k, a]) => localStorage.setItem(k, JSON.stringify({ accessToken: "at.broken", refreshToken: a.refreshToken, expiresAt: Date.now() + 86_400_000, user: a.user })), [SESSION_KEY, auth] as const);
  await page.goto("/account");
  await expect(page.getByLabel("Name · 이름")).toHaveValue("큐레이터"); // GET /users/me: 401 → refresh → retry
  const session = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), SESSION_KEY);
  expect(session.accessToken).not.toBe("at.broken");
  expect(session.refreshToken).not.toBe(auth.refreshToken); // refresh tokens are single-use, so the pair rotated
});
