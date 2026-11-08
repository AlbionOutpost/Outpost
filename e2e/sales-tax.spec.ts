import { test, expect } from "@playwright/test";

// Owner decision (8 Nov 2026): sales tax starts at Premium 4%, with 4% / 8% quick choices.
test("sales tax starts at Premium 4% and the quick choices set 8% or 4%", async ({ page }) => {
  await page.goto("/tools/flipping?region=europe");
  // The route scan starts at 4% too.
  await expect(page.getByLabel("Scan sales tax (%)", { exact: true })).toHaveValue("4");
  await page.getByRole("tab", { name: "Check one trade", exact: true }).click();
  await page.getByText("Fees & extra costs", { exact: true }).click();
  const tax = page.getByLabel("Sales tax (%)", { exact: true });
  await expect(tax).toHaveValue("4");
  const presets = page
    .locator("#trade-inputs")
    .getByRole("group", { name: "Premium or no premium", exact: true });
  await expect(presets.getByRole("button", { name: "Premium 4%" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await presets.getByRole("button", { name: "No premium 8%" }).click();
  await expect(tax).toHaveValue("8");
  await expect(presets.getByRole("button", { name: "No premium 8%" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("#trade-inputs [data-assumptions]")).toContainText("8% tax");
  // A typed rate still wins and lights neither choice.
  await tax.fill("6.5");
  await expect(presets.getByRole("button", { name: /Premium/ }).first()).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await presets.getByRole("button", { name: "Premium 4%" }).click();
  await expect(tax).toHaveValue("4");
});

for (const [path, label] of [
  ["/tools/crafting", "Sales tax (%)"],
  ["/tools/transporting", "Transport sales tax (%)"],
  ["/tools/laborers", "Sales tax (%)"],
  ["/tools/farming", "Produce sales tax + setup (%)"],
] as const)
  test(`${path} starts its sales tax at 4%`, async ({ page }) => {
    await page.goto(`${path}?region=europe`);
    const field = page.getByLabel(label, { exact: true });
    // Hidden or not (fees sit in a closed disclosure), the field holds the default.
    await expect(field).toHaveValue("4");
  });
