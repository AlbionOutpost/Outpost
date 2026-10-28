import { test, expect } from "@playwright/test";

test("market data guidance preserves exact lookup and offers the optional official client", async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: "atlas-region", value: "americas", domain: "localhost", path: "/" },
  ]);
  await page.goto("/market-data");
  await expect(page.getByRole("complementary", { name: "Your market selection" })).toContainText(
    "Americas",
  );
  await expect(page).toHaveTitle("Market data & coverage | Outpost");
  await page.goto("/market-data?region=asia&item=T8_MAIN_AXE&quality=2&city=Martlock");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Better decisions");
  const lookup = page.getByRole("complementary", { name: "Your market selection" });
  await expect(lookup).toContainText("Asia");
  await expect(lookup).toContainText("Good quality");
  await expect(lookup).toContainText("Martlock");
  await expect(page.getByRole("link", { name: "Get the data client" })).toHaveAttribute(
    "href",
    "https://www.albion-online-data.com/client/",
  );
  await page.getByRole("link", { name: "Back to your market" }).click();
  await expect(page.getByLabel("Item identifier", { exact: true })).toHaveValue("T8_MAIN_AXE");
  await expect(page.getByLabel("Quality", { exact: true })).toHaveValue("2");
  await expect(page.getByLabel("Market city", { exact: true })).toHaveValue("Martlock");
});
