import { expect, type Page } from "@playwright/test";
export async function chooseRegion(page: Page, region: "europe" | "americas" | "asia") {
  const picker = page.getByRole("combobox", { name: "Albion region", exact: true });
  const changing = (await picker.getAttribute("data-region")) !== region;
  await picker.click();
  await page
    .getByRole("option", {
      name: { europe: "Europe", americas: "Americas", asia: "Asia" }[region],
      exact: true,
    })
    .click();
  // A header update alone can precede navigation. Wait for the committed URL as
  // well, so consumers assert against the destination rather than a pending route.
  if (changing)
    await expect(page).toHaveURL((url) => url.searchParams.get("region") === region, {
      timeout: 20000,
    });
  await expect(picker).toHaveAttribute("data-region", region, { timeout: 20000 });
}
