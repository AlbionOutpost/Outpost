import { expect, type Page } from "@playwright/test";
/** Follow the focused editor instead of relying on every equipment field being visible at once.
 * On Equipment (and for an empty slot anywhere) the board's slot opens the item picker; this
 * closes it again so the slot is simply selected in the inspector. */
export async function selectEditorSlot(
  page: Page,
  slot: string,
  section: "Equipment" | "Abilities" | "Alternatives" = "Equipment",
) {
  await page.getByRole("tab", { name: section, exact: true }).click();
  const button = page
    .getByRole("group", { name: "Editor equipment inventory", exact: true })
    .getByRole("button", {
      name: new RegExp(`^(?:Inspect ${slot}(?::| )|Choose ${slot} equipment:)`),
    });
  const opensPicker = (await button.getAttribute("aria-label"))?.startsWith("Choose");
  await button.click();
  if (!opensPicker) return;
  const picker = page.locator("dialog.slot-picker-dialog");
  await expect(picker).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(picker).toHaveCount(0);
}
