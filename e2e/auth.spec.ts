import { test, expect } from "@playwright/test";
import { API, SESSION_KEY, coverBoxes, expectUndistorted, routeIdFor, signInAs } from "./helpers";

const DEMO = { email: "demo@coverage.test", password: "coverage123" };

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
  await page.goto("/signup?next=/%09/example.com/"); // off-site `next` (tab-stripped to //example.com by URL parsing) must not be followed
  await page.getByLabel("Name · 이름").fill("E2E Curator");
  await page.getByLabel("Email · 이메일").fill(`e2e-${Date.now()}@coverage.test`);
  await page.getByLabel("Password · 비밀번호").fill("coverage123");
  await page.getByRole("button", { name: /Create account/ }).click();
  await expect(page.getByRole("link", { name: /^Account — E2E Curator/ })).toBeVisible();
  await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);

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

// safeNext: the login form only ever lands on this site, and never back on the sign-in / join form itself.
for (const next of ["http://coverage.local//example.com/", "//example.com", "/login"]) {
  test(`sign-in ignores an off-site or self-referential next: ${next}`, async ({ page }) => {
    await page.goto(`/login?next=${encodeURIComponent(next)}`);
    await page.getByLabel("Email · 이메일").fill(DEMO.email);
    await page.getByLabel("Password · 비밀번호").fill(DEMO.password);
    await page.getByRole("button", { name: /Sign in/ }).click();
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);
  });
}

test("a wrong password shows the backend's credentials message", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email · 이메일").fill(DEMO.email);
  await page.getByLabel("Password · 비밀번호").fill("nope-nope");
  await page.getByRole("button", { name: /Sign in/ }).click();
  // Scoped to the page body: Next keeps its own (empty) route announcer with role="alert" outside <main>.
  await expect(page.locator("main").getByRole("alert")).toHaveText("이메일 또는 비밀번호가 올바르지 않습니다");
  await expect(page).toHaveURL(/\/login/);
});

test("a dead session is cleared and sent to sign in", async ({ page }) => {
  await page.goto("/login");
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ accessToken: "at.broken", refreshToken: "rt.broken", expiresAt: Date.now() + 86_400_000, user: { id: "x", email: "x@x.test", displayName: "x", role: "MEMBER" } })), SESSION_KEY);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=(%2F|\/)account/); // GET /users/me 401 → refresh 400 → session over
  expect(await page.evaluate((k) => localStorage.getItem(k), SESSION_KEY)).toBeNull();
});

test("a transient refresh failure keeps the session", async ({ page, request }) => {
  const auth = await signInAs(page, request, DEMO);
  // The access token is due for renewal, but the refresh endpoint is down for a moment.
  await page.evaluate(([k, a]) => localStorage.setItem(k, JSON.stringify({ accessToken: a.accessToken, refreshToken: a.refreshToken, expiresAt: Date.now(), user: a.user })), [SESSION_KEY, auth] as const);
  await page.route("**/api/auth/refresh", (r) => r.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
  await page.goto("/account");
  await expect(page.getByLabel("Name · 이름")).toHaveValue("큐레이터"); // the still-valid access token is used as is
  expect(await page.evaluate((k) => localStorage.getItem(k), SESSION_KEY)).not.toBeNull();
});

test("a rejected token is not retried when the refresh service is down", async ({ page }) => {
  await page.goto("/login");
  // The access token is no longer accepted and the refresh endpoint is down: the session is kept, so this is not a sign-out.
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ accessToken: "at.broken", refreshToken: "rt.any", expiresAt: Date.now() + 86_400_000, user: { id: "x", email: "x@x.test", displayName: "x", role: "MEMBER" } })), SESSION_KEY);
  await page.route("**/api/auth/refresh", (r) => r.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
  await page.goto("/account");
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/account$/);
  expect(await page.evaluate((k) => localStorage.getItem(k), SESSION_KEY)).not.toBeNull();
});

test("a request is never replayed under an account another tab signed in to", async ({ page, request }) => {
  const res = await request.post(`${API}/api/auth/signup`, { data: { email: `other-${Date.now()}@coverage.test`, password: "coverage123", displayName: "Other", role: "MEMBER" } });
  expect(res.ok()).toBeTruthy();
  const other = await res.json();
  await page.goto("/login");
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ accessToken: "at.broken", refreshToken: "rt.any", expiresAt: Date.now() + 86_400_000, user: { id: "x", email: "x@x.test", displayName: "x", role: "MEMBER" } })), SESSION_KEY);
  const sent: string[] = [];
  page.on("request", (r) => { if (r.url().includes("/api/users/me")) sent.push(r.headers().authorization ?? ""); });
  // While the first profile request is out, another tab signs in as someone else.
  await page.route("**/api/users/me", async (r) => {
    if (r.request().headers().authorization === "Bearer at.broken") {
      await page.evaluate(([k, a]) => localStorage.setItem(k, JSON.stringify({ accessToken: a.accessToken, refreshToken: a.refreshToken, expiresAt: Date.now() + 86_400_000, user: a.user })), [SESSION_KEY, other] as const);
      return r.fulfill({ status: 401, contentType: "application/json", body: "{}" });
    }
    return r.continue();
  });
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login/);
  expect(sent.slice(0, 1)).toEqual(["Bearer at.broken"]);
  expect(sent.slice(1), "the 401'd request was retried with the other account's token").not.toContain(`Bearer ${other.accessToken}`);
});

test("a private room is closed to guests and to other members", async ({ page, browser, request }) => {
  const owner = await (await request.post(`${API}/api/auth/signup`, { data: { email: `e2e-${Date.now()}-owner@coverage.test`, password: "coverage123", displayName: "E2E Owner", role: "MEMBER" } })).json();
  const h = { Authorization: `Bearer ${owner.accessToken}` };
  const room = await (await request.post(`${API}/api/collections`, { headers: h, data: { name: "Private E2E", visibility: "LINK_ONLY" } })).json();

  const guest = await (await browser.newContext()).newPage();
  await guest.goto(`/c/${room.shareToken}`);
  await expect(guest.getByRole("heading", { name: "Private E2E" })).toBeVisible();

  // The moment it is private the share link is closed — no server-side cache may keep serving it.
  await request.put(`${API}/api/collections/${room.id}`, { headers: h, data: { visibility: "PRIVATE" } });
  expect((await guest.goto(`/c/${room.shareToken}`))?.status()).toBe(404);
  await guest.goto(`/collections/${room.id}`);
  await expect(guest.getByText("Members only, for now.")).toBeVisible();

  await signInAs(page, request, DEMO);
  await page.goto(`/collections/${room.id}`);
  await expect(page.getByText("A private room.")).toBeVisible();
});

test("two tabs renewing the same token at once both stay signed in", async ({ page, request, context }) => {
  const auth = await signInAs(page, request, DEMO);
  // Due for renewal in both tabs: without a cross-tab lock the second refresh spends a used token and logs out.
  await page.evaluate(([k, a]) => localStorage.setItem(k, JSON.stringify({ accessToken: a.accessToken, refreshToken: a.refreshToken, expiresAt: Date.now(), user: a.user })), [SESSION_KEY, auth] as const);
  const other = await context.newPage();
  await Promise.all([page.goto("/account"), other.goto("/account")]);
  for (const p of [page, other]) await expect(p.getByLabel("Name · 이름")).toHaveValue("큐레이터");
  const s = JSON.parse((await page.evaluate((k) => localStorage.getItem(k), SESSION_KEY))!);
  expect(s.refreshToken).not.toBe(auth.refreshToken);
});
