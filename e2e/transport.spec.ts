import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();
test("transport arithmetic and saved plans persist with explicit price provenance", async ({
  page,
  context,
}) => {
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  await db.user.create({
    data: {
      id,
      sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
    },
  });
  try {
    await context.addCookies([
      {
        name: "next-auth.session-token",
        value: token,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    await page.goto("/tools/transporting?region=europe");
    await page.getByLabel("Sale execution", { exact: true }).selectOption("listing");
    for (const [label, value] of [
      ["Cargo quantity", "10"],
      ["Weight per item (kg)", "15"],
      ["Available cargo capacity (kg)", "100"],
      ["Cost per trip", "20"],
      ["Total manual risk allowance", "10"],
      ["Transport purchase unit price", "100"],
      ["Transport sale unit price", "150"],
      ["Transport sales tax (%)", "8"],
      ["Transport listing fee (%)", "2.5"],
    ])
      await page.getByLabel(label, { exact: true }).fill(value);
    await expect(page.locator(".panel.result > strong")).toHaveText("292.5");
    await page.getByLabel("Sale execution", { exact: true }).selectOption("instant");
    await expect(page.locator(".panel.result > strong")).toHaveText("330");
    await expect(page.getByLabel("Transport listing fee (%)", { exact: true })).toBeDisabled();
    await page.getByLabel("Sale execution", { exact: true }).selectOption("listing");
    await page.getByLabel("Available cargo capacity (kg)", { exact: true }).fill("0");
    await expect(page.locator(".transport-route-profit")).toContainText("positive capacity");
    await page.getByLabel("Available cargo capacity (kg)", { exact: true }).fill("100");
    await page.getByLabel("Transport plan title", { exact: true }).fill("Verified cargo run");
    await page.getByRole("button", { name: "Save transport plan", exact: true }).click();
    await expect(
      page.getByText("Transport plan saved to your account.", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Load transport plans", exact: true }).click();
    await page.getByRole("button", { name: "Restore Verified cargo run", exact: true }).click();
    await expect(page.locator(".panel.result > strong")).toHaveText("292.5");
    await page.setViewportSize({ width: 375, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: ".qa/screenshots/transport-375.png", fullPage: true });
    await page.getByRole("button", { name: "Delete Verified cargo run", exact: true }).click();
    await expect(page.getByText("Transport plan deleted.", { exact: true })).toBeVisible();
  } finally {
    await db.user.delete({ where: { id } });
  }
});
