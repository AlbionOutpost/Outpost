import { expect, test } from "@playwright/test";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=",
  "base64",
);

test("item artwork retries its primary source after the selected item or quality changes", async ({
  page,
}) => {
  const primary: string[] = [];
  await page.route("https://render.albiononline.com/**", (route) => {
    const url = new URL(route.request().url());
    primary.push(url.href);
    return url.pathname.endsWith("/T4_BAG.png")
      ? route.fulfill({ status: 404, body: "Unavailable fixture artwork" })
      : route.fulfill({ contentType: "image/png", body: png });
  });
  await page.route("**/api/item-icon?*", (route) =>
    route.fulfill({ contentType: "image/png", body: png }),
  );
  await page.route("**/api/market?*", (route) => route.fulfill({ json: { prices: [] } }));
  await page.route("**/api/history?*", (route) => route.fulfill({ json: { data: [] } }));
  await page.goto("/tools/market?region=europe&item=T4_BAG&quality=1");
  const artwork = page.locator(".mx-item-well img");
  await expect(artwork).toHaveAttribute("src", /\/api\/item-icon\?id=T4_BAG&quality=1$/);
  await expect
    .poll(() => artwork.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);

  await page.getByRole("button", { name: "Battleaxe", exact: true }).click();
  await expect(artwork).toHaveAttribute(
    "src",
    /render\.albiononline\.com\/v1\/item\/T4_MAIN_AXE\.png\?quality=1&size=160$/,
  );
  await expect
    .poll(() => artwork.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);

  // Fail the selected quality, then verify the next quality gets its own primary attempt.
  await page.route("https://render.albiononline.com/**", (route) => {
    const url = new URL(route.request().url());
    primary.push(url.href);
    return url.pathname.endsWith("/T4_MAIN_AXE.png") && url.searchParams.get("quality") === "2"
      ? route.fulfill({ status: 404, body: "Unavailable fixture quality" })
      : route.fulfill({ contentType: "image/png", body: png });
  });
  await page.getByLabel("Quality", { exact: true }).selectOption("2");
  await expect(artwork).toHaveAttribute("src", /\/api\/item-icon\?id=T4_MAIN_AXE&quality=2$/);
  await page.getByLabel("Quality", { exact: true }).selectOption("3");
  await expect(artwork).toHaveAttribute(
    "src",
    /render\.albiononline\.com\/v1\/item\/T4_MAIN_AXE\.png\?quality=3&size=160$/,
  );
  await expect
    .poll(() => artwork.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  expect(primary.some((url) => url.includes("T4_MAIN_AXE.png?quality=3&size=160"))).toBe(true);
});
