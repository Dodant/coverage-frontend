import { test, expect } from "@playwright/test";
import { routeIdFor, signInAs } from "./helpers";

const DEMO = { email: "demo@coverage.test", password: "coverage123" };

test("the exhibition picker hangs above its button and closes on Esc, an outside click and its own button", async ({ page, request }) => {
  await signInAs(page, request, DEMO);
  await page.goto(`/artwork/${await routeIdFor(request, "입속의 새")}`);
  const button = page.getByRole("button", { name: /Exhibit · 전시에 추가/ });
  const picker = page.getByRole("dialog", { name: "Add to exhibition" });

  await button.click();
  await expect(picker).toBeVisible();
  await expect(picker.getByPlaceholder("New exhibition…")).toBeVisible();
  const [b, p] = [(await button.boundingBox())!, (await picker.boundingBox())!];
  expect(Math.abs(p.x - b.x), "left edges line up").toBeLessThan(2);
  expect(p.y + p.height, "panel sits above the button").toBeLessThanOrEqual(b.y);
  await page.keyboard.press("Escape");
  await expect(picker).toBeHidden();

  await button.click();
  await expect(picker).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(picker).toBeHidden();

  await button.click();
  await expect(picker).toBeVisible();
  await button.click();
  await expect(picker).toBeHidden();
});

test("artwork: Inspect is a native modal; Esc closes it and focus returns", async ({ page, request }) => {
  await page.goto(`/artwork/${await routeIdFor(request, "입속의 새")}`);
  const opener = page.getByRole("button", { name: "⤢ Inspect", exact: true });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: /^Inspect / });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((d) => d.matches("dialog:modal"))).toBe(true);
  await expect(dialog.getByRole("button", { name: "Close ✕" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("sign-in: the password can be shown and hidden again", async ({ page }) => {
  await page.goto("/login");
  const pw = page.getByLabel("Password · 비밀번호");
  const toggle = page.getByRole("button", { name: "Show password" });
  await pw.fill("coverage123");
  await expect(pw).toHaveAttribute("type", "password");
  await toggle.click();
  await expect(pw).toHaveAttribute("type", "text");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(pw).toHaveAttribute("type", "password");
});
