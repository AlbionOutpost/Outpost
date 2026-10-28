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
  await expect(picker).toHaveAttribute("data-region", region);
}
