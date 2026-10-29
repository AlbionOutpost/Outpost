import { test, expect } from "@playwright/test";

test("build section navigation follows deep links, keyboard activation, history and reload", async ({
  page,
}) => {
  await page.goto("/builds/library/battleaxe-mist-build?region=asia#build-stats");
  const navigation = page.getByRole("navigation", { name: "Build sections", exact: true });
  const active = navigation.locator('[aria-current="location"]');
  await expect(active).toHaveCount(1);
  await expect(active).toHaveText("Stats & calculations");

  await navigation.getByRole("link", { name: "Abilities", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\?region=asia#build-abilities$/);
  await expect(active).toHaveText("Abilities");

  await navigation.getByRole("link", { name: "Alternatives", exact: true }).click();
  await expect(page).toHaveURL(/\?region=asia#build-alternatives$/);
  await expect(active).toHaveText("Alternatives");

  await page.goBack();
  await expect(active).toHaveText("Abilities");
  await page.goForward();
  await expect(active).toHaveText("Alternatives");

  await page.reload();
  await expect(active).toHaveCount(1);
  await expect(active).toHaveText("Alternatives");
  expect(new URL(page.url()).searchParams.get("region")).toBe("asia");

  await navigation.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(active).toHaveText("Overview");
  await expect(page).toHaveURL(/\?region=asia#build-overview$/);
});
