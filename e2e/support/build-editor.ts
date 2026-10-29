import { type Page } from "@playwright/test";
/** Follow the focused editor instead of relying on every equipment field being visible at once. */
export async function selectEditorSlot(
  page: Page,
  slot: string,
  section: "Equipment" | "Abilities" | "Alternatives" = "Equipment",
) {
  await page.getByRole("tab", { name: section, exact: true }).click();
  await page
    .getByRole("group", { name: "Editor equipment inventory", exact: true })
    .getByRole("button", { name: `Inspect ${slot}:`, exact: false })
    .click();
}
