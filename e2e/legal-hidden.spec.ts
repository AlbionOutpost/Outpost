import { test, expect } from "@playwright/test";
import { legalPublished } from "../src/lib/legal";

test.skip(legalPublished, "Only while the legal page is unpublished");

test("the unpublished legal page answers 404 and nothing links to it", async ({
  page,
  request,
}) => {
  expect((await request.get("/legal")).status()).toBe(404);
  expect((await request.get("/legal?lang=de")).status()).toBe(404);
  for (const path of ["/", "/signin", "/tools"]) {
    await page.goto(path);
    await expect(page.locator('a[href^="/legal"]')).toHaveCount(0);
  }
  const llms = await request.get("/llms.txt");
  expect(await llms.text()).not.toContain("/legal");
});
