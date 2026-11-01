import { selectEditorSlot } from "./support/build-editor";
import { test, expect } from "@playwright/test";
import { guestBuildStorageKey } from "../src/lib/guest-build-storage";
test("guest can edit, preview, save, restore and export a build without gaining account write access", async ({
  page,
  context,
}) => {
  // One long journey (edit, preview, save, restore, export, isolation, recovery) on a cold server.
  test.setTimeout(120000);
  await page.goto("/builds/new");
  await expect(page).toHaveURL(/\/builds\/new$/);
  await page.getByRole("button", { name: "Load example equipment", exact: true }).click();
  await page.getByLabel("Build title", { exact: true }).fill("Guest equipment test");
  await selectEditorSlot(page, "Helmet");
  await page.getByRole("button", { name: "Choose Helmet equipment", exact: false }).click();
  await page.getByRole("button", { name: /^Equip Mercenary Hood/ }).click();
  await selectEditorSlot(page, "Helmet", "Alternatives");
  await page.getByRole("button", { name: "Choose alternative Helmet", exact: false }).click();
  await page.getByRole("button", { name: /^Equip Scholar Cowl/ }).click();
  await page.getByRole("button", { name: "Save on this device", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Guest draft saved on this device" }),
  ).toBeVisible();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("outpost-guest-build-v1")!),
  );
  expect(
    stored.equipment.find((r: { slot: string }) => r.slot === "Helmet").alternativeItemIds,
  ).toEqual(["T4_HEAD_CLOTH_SET1"]);
  const denied = await context.request.post("/api/builds", {
    headers: { origin: "http://localhost:3000" },
    data: stored,
  });
  expect(denied.status()).toBe(401);
  await page.reload();
  await expect(page.getByLabel("Build title", { exact: true })).toHaveValue("Guest equipment test");
  await selectEditorSlot(page, "Helmet");
  await expect(
    page.getByRole("button", { name: "Choose Helmet equipment", exact: false }),
  ).toHaveAccessibleName(/Mercenary Hood/);
  await page.getByRole("button", { name: "Preview build", exact: true }).click();
  const preview = page.getByRole("dialog", { name: "Build preview", exact: true });
  await expect(
    preview.getByRole("heading", { name: "Guest equipment test", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(preview).toHaveCount(0);
  await page.getByText("Import & export", { exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export build JSON", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("outpost-build.json");
  await page.getByLabel("Import build JSON", { exact: true }).setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"title":"bad"}'),
  });
  await expect(page.getByLabel("Build title", { exact: true })).toHaveValue("Guest equipment test");
  const tieredFood = structuredClone(stored);
  await expect(page.locator(".focused-build-editor").getByRole("alert")).toContainText(
    "Choose a valid Outpost build JSON file",
  );
  await expect(page.locator(".focused-build-editor").getByRole("alert")).not.toContainText(
    '"path"',
  );
  tieredFood.equipment.find((row: { slot: string }) => row.slot === "Food").itemId =
    "T7_MEAL_ROAST";
  await page.getByLabel("Import build JSON", { exact: true }).setInputFiles({
    name: "tiered-food.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(tieredFood)),
  });
  await selectEditorSlot(page, "Food");
  await expect(
    page.getByRole("button", { name: "Choose Food equipment", exact: false }),
  ).toHaveAccessibleName(/Roast Pork/);
  await selectEditorSlot(page, "Main hand");
  await page.getByRole("button", { name: "Choose Main hand equipment", exact: false }).click();
  await page.getByLabel("Search equipment", { exact: true }).fill("Bloodmoon");
  await page.getByRole("button", { name: /^Equip Bloodmoon Staff/ }).click();
  await selectEditorSlot(page, "Main hand", "Abilities");
  await page.getByLabel("Main hand Q", { exact: true }).selectOption("Reality Fissure");
  await expect(page.getByLabel("Main hand Q", { exact: true })).toHaveValue("Reality Fissure");
  await page.getByLabel("Main hand E", { exact: true }).selectOption("Werewolf Transformation");
  await expect(
    page.locator('.studio-spell-choices [data-albion-spell-id="SHAPE_Q_SKILLSHOT"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('.studio-spell-choices [data-albion-spell-id="SHAPESHIFT_WEREWOLF"]'),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Preview build", exact: true }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Build preview", exact: true })
      .locator(".loadout-ability-row .loadout-slot-label")
      .first(),
  ).toHaveText("Main hand");
  await expect(
    page
      .getByRole("dialog", { name: "Build preview", exact: true })
      .getByText("Werewolf Transformation", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  const isolated = await context.browser()!.newContext();
  try {
    const other = await isolated.newPage();
    await other.goto("/builds/new");
    await expect(other.getByLabel("Build title", { exact: true })).toHaveValue("");
  } finally {
    await isolated.close();
  }
  await page.getByLabel("Build title", { exact: true }).fill("Guest navigation recovery");
  await page.locator(".editor-backline").getByRole("link", { name: "Builds", exact: true }).click();
  await expect(page).toHaveURL(/\/builds$/);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("outpost-guest-build-v1")!).title),
  ).toBe("Guest navigation recovery");
  await page.getByRole("link", { name: "Create a build", exact: true }).click();
  await expect(page.getByLabel("Build title", { exact: true })).toHaveValue(
    "Guest navigation recovery",
  );
  await page.getByLabel("Build title", { exact: true }).fill("Guest immediate history recovery");
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("outpost-guest-build-v1")!).title),
  ).toBe("Guest navigation recovery");
  await page.goBack();
  await expect(page).toHaveURL(/\/builds$/);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("outpost-guest-build-v1")!).title),
  ).toBe("Guest immediate history recovery");
  await page.goForward();
  await expect(page.getByLabel("Build title", { exact: true })).toHaveValue(
    "Guest immediate history recovery",
  );
  await page.getByLabel("Build title", { exact: true }).fill("x");
  await page.goBack();
  await expect(page).toHaveURL(/\/builds$/);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("outpost-guest-build-v1")!).title),
  ).toBe("Guest immediate history recovery");
  await page.goForward();
  await expect(page.getByLabel("Build title", { exact: true })).toHaveValue(
    "Guest immediate history recovery",
  );
  for (const width of [320, 390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.goto("/builds/new?from=battleaxe-mist-build&region=europe");
  await expect(page.getByLabel("Build title", { exact: true })).toBeEnabled();
  await page.getByLabel("Build title", { exact: true }).fill("Source-specific guest draft");
  await selectEditorSlot(page, "Helmet");
  await page.getByRole("button", { name: /^Choose Helmet equipment:/ }).click();
  await page.getByRole("button", { name: /^Equip Scholar Cowl\b/ }).click();
  await page.getByLabel("Helmet Active", { exact: true }).selectOption("Energy Shield");
  await page.getByRole("button", { name: "Save on this device", exact: true }).click();
  const sourceKey = guestBuildStorageKey("new:battleaxe-mist-build:europe", true);
  await page.reload();
  await expect(page.getByLabel("Build title", { exact: true })).toHaveValue(
    "Source-specific guest draft",
  );
  await selectEditorSlot(page, "Helmet", "Abilities");
  await expect(page.getByLabel("Helmet Active", { exact: true })).toHaveValue("Energy Shield");
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).title, sourceKey),
  ).toBe("Source-specific guest draft");
  await page.locator(".editor-backline").getByRole("link", { name: "Builds", exact: true }).click();
  await expect(page).toHaveURL(/\/builds$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/builds\/new\?from=battleaxe-mist-build&region=europe$/);
  await expect(page.getByLabel("Build title", { exact: true })).toHaveValue(
    "Source-specific guest draft",
  );
  await page.getByLabel("Build title", { exact: true }).fill("Source immediate history recovery");
  await page.goForward();
  await expect(page).toHaveURL(/\/builds$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/builds\/new\?from=battleaxe-mist-build&region=europe$/);
  await expect(page.getByLabel("Build title", { exact: true })).toHaveValue(
    "Source immediate history recovery",
  );
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).title, sourceKey),
  ).toBe("Source immediate history recovery");
  await page.goto("/builds/new?from=battleaxe-mist-build&region=asia");
  await expect(page.getByLabel("Build title", { exact: true })).toBeEnabled();
  await expect(page.getByLabel("Build title", { exact: true })).not.toHaveValue(
    "Source immediate history recovery",
  );
  await page.getByLabel("Build title", { exact: true }).fill("Independent Asia source draft");
  await page.getByRole("button", { name: "Save on this device", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Build title", { exact: true })).toHaveValue(
    "Independent Asia source draft",
  );
  await page.goto("/builds/new?from=battleaxe-mist-build&region=europe");
  await expect(page.getByLabel("Build title", { exact: true })).toHaveValue(
    "Source immediate history recovery",
  );
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("outpost-guest-build-v1")!).title),
  ).toBe("Guest immediate history recovery");
  const corrupt = '{"incomplete":true}';
  const sourceIsolated = await context.browser()!.newContext();
  try {
    const other = await sourceIsolated.newPage();
    await other.goto("/builds/new?from=battleaxe-mist-build&region=europe");
    await expect(other.getByLabel("Build title", { exact: true })).toBeEnabled();
    await expect(other.getByLabel("Build title", { exact: true })).not.toHaveValue(
      "Source immediate history recovery",
    );
  } finally {
    await sourceIsolated.close();
  }
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: sourceKey,
    value: corrupt,
  });
  await page.reload();
  // The recovery notice renders after hydration reads storage; a cold CI compile can take longer.
  await expect(page.locator(".focused-build-editor").getByRole("alert")).toContainText(
    "has been kept",
    { timeout: 20000 },
  );
  await page.clock.install();
  await page.clock.fastForward(1500);
  expect(await page.evaluate((key) => localStorage.getItem(key), sourceKey)).toBe(corrupt);
  await page.getByLabel("Build title", { exact: true }).fill("Deliberately replaced source draft");
  await page.getByRole("button", { name: "Save on this device", exact: true }).click();
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).title, sourceKey),
  ).toBe("Deliberately replaced source draft");
});
