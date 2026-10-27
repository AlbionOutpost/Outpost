import { test, expect } from "@playwright/test";

test("market first use separates configuration, loading, source failure and a genuine missing response", async ({
  page,
}) => {
  let calls = 0;
  let release: () => void = () => {};
  await page.route("**/api/market?*", async (route) => {
    calls++;
    if (calls === 1) {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return route.fulfill({ status: 503, json: { error: "Source did not respond" } });
    }
    return route.fulfill({ json: { region: "europe", prices: [] } });
  });
  await page.goto("/tools/market?region=europe");
  await expect(page.locator(".market-first-use")).toContainText("Choose an item");
  await expect(page.locator(".market-quote-summary")).toHaveCount(0);
  expect(calls).toBe(0);
  await page.getByLabel("Quality", { exact: true }).selectOption("2");
  await page.getByLabel("Market city", { exact: true }).selectOption("Caerleon");
  await page.getByRole("button", { name: "Compare prices", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Fetching observations…", exact: true }),
  ).toBeDisabled();
  release();
  await expect(page.locator("main").getByRole("alert")).toContainText("Source did not respond");
  await expect(page.locator(".market-first-use")).toContainText("Your selection is kept");
  await expect(page.getByLabel("Quality", { exact: true })).toHaveValue("2");
  await expect(page.getByLabel("Market city", { exact: true })).toHaveValue("Caerleon");
  await page.getByRole("button", { name: "Compare prices", exact: true }).click();
  await expect(page.locator(".task-state")).toContainText("No usable prices returned");
  await expect(page.locator(".task-state")).toContainText("No last observation is known");
  await expect(page.locator(".market-item-panel")).toBeVisible();
});
