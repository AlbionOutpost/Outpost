import { expect, type Page } from "@playwright/test";
export async function chooseRegion(page: Page, region: "europe" | "americas" | "asia") {
  const picker = page.getByRole("combobox", { name: "Albion region", exact: true });
  await picker.click();
  await page
    .getByRole("option", {
      name: { europe: "Europe", americas: "Americas", asia: "Asia" }[region],
      exact: true,
    })
    .click();
  // The choice navigates (router.push with the new region); the server render can take a
  // few seconds on a cold CI runner, so wait longer than the default for the trigger to update.
  await expect(picker).toHaveAttribute("data-region", region, { timeout: 20000 });
}
