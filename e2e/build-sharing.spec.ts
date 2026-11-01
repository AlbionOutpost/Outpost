import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("build sharing copies real links and exports inventory PNGs with truthful artwork fallback", async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  // Exercise unavailable art explicitly. These are export fixtures, never live observations or game-art evidence.
  await page.route("**/api/item-icon?**", (route) =>
    route.fulfill({ status: 503, body: "Artwork temporarily unavailable" }),
  );
  await page.goto("/builds/library/battleaxe-mist-build?region=asia");
  const share = page.locator(".build-share-control summary");
  await share.click();
  await page.getByRole("button", { name: "Copy build link", exact: true }).click();
  await expect(page.locator(".build-share-status")).toHaveText("Build link copied.");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url());
  await share.click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PNG", exact: true }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("outpost-Battleaxe-Mist-Build.png");
  const path = await download.path();
  const png = await readFile(path!);
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(png.readUInt32BE(16)).toBe(900);
  expect(png.readUInt32BE(20)).toBe(1120);
  await expect(page.locator(".build-share-status")).toContainText(
    "Unavailable artwork is labeled with item names",
  );
  await expect(page.locator(".build-loadout-view")).toHaveAttribute(
    "data-selected-slot",
    "Main hand",
  );
  await share.click();
  await page.getByRole("button", { name: "Copy as image", exact: true }).click();
  await expect(page.locator(".build-share-status")).toContainText("Image copied");
  expect(await page.evaluate(async () => (await navigator.clipboard.read())[0].types)).toContain(
    "image/png",
  );
  await page.evaluate(() =>
    Object.defineProperty(window, "ClipboardItem", { configurable: true, value: undefined }),
  );
  await share.click();
  await page.getByRole("button", { name: "Copy as image", exact: true }).click();
  await expect(page.locator(".build-share-status")).toContainText("Use Download PNG instead");
});
