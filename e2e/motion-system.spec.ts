import { test, expect } from "@playwright/test";

test("shared controls grow, press and still navigate with the current region", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/tools?region=asia");
  const link = page.getByRole("link", { name: "Sign in", exact: true });
  const width = (await link.boundingBox())!.width;
  await link.hover();
  await expect.poll(async () => (await link.boundingBox())!.width).toBeGreaterThan(width * 1.02);
  await page.mouse.down();
  await expect.poll(async () => (await link.boundingBox())!.width).toBeLessThan(width * 0.99);
  await page.mouse.move(0, 100);
  await page.mouse.up();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Builds", exact: true })
    .click();
  await expect(page).toHaveURL(/\/builds\?region=asia$/);
});

test("card hover grows once, stays enlarged and returns on pointer leave", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/tools");
  await page.evaluate(() => document.fonts.ready);
  const card = page.locator(".directory-entry").first();
  await card.scrollIntoViewIfNeeded();
  const original = (await card.boundingBox())!.width;
  await card.hover({ position: { x: 16, y: 16 } });
  await expect.poll(async () => (await card.boundingBox())!.width).toBeGreaterThan(original * 1.01);
  const widths: number[] = [];
  for (const delay of [250, 750, 1250]) {
    await page.waitForTimeout(delay);
    widths.push((await card.boundingBox())!.width);
    expect(
      await card.evaluate((el) => {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform);
        return matrix.is2D && matrix.b === 0 && matrix.c === 0 && matrix.e === 0 && matrix.f === 0;
      }),
    ).toBe(true);
  }
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(0.2);
  await page.mouse.move(0, 0);
  await expect
    .poll(async () => Math.abs((await card.boundingBox())!.width - original))
    .toBeLessThan(0.2);
  await card.click();
  await expect(page).toHaveURL(/\/tools\/market/);
});

test("live reduced-motion preference cancels growth and retains keyboard region selection", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/tools");
  await page.evaluate(() => document.fonts.ready);
  await expect(
    page.getByRole("button", { name: "Search items, builds… Ctrl K", exact: true }),
  ).toBeEnabled();
  const card = page.locator(".directory-entry").first();
  await card.hover({ position: { x: 16, y: 16 } });
  await expect
    .poll(() => card.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).a))
    .toBeGreaterThan(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      card.evaluate((el) => {
        const transform = getComputedStyle(el).transform;
        return new DOMMatrixReadOnly(transform === "none" ? undefined : transform).isIdentity;
      }),
    )
    .toBe(true);
  const picker = page.getByRole("combobox", { name: "Albion region" });
  await picker.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(picker).toHaveAttribute("data-region", "asia");
  await expect(picker).toBeFocused();
  expect(
    await page
      .locator("main")
      .evaluate(
        (el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length,
      ),
  ).toBe(0);
});

test("touch interaction has no sticky hover growth and navigation remains usable at 320px", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://localhost:3000",
    viewport: { width: 320, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  try {
    const page = await context.newPage();
    await page.goto("/tools");
    expect(
      await page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches),
    ).toBe(false);
    await page.locator(".directory-entry").first().tap();
    await expect(page).toHaveURL(/\/tools\/market/);
    const picker = page.getByRole("combobox", { name: "Albion region" });
    await picker.tap();
    await expect
      .poll(() =>
        picker.evaluate((el) => {
          const transform = getComputedStyle(el).transform;
          return new DOMMatrixReadOnly(transform === "none" ? undefined : transform).a;
        }),
      )
      .toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  } finally {
    await context.close();
  }
});
