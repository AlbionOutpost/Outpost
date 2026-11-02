import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { mockTopKills } from "./support/top-kills";

test("top kill loadouts, inventory and section link fit their cards at every review width", async ({
  page,
}) => {
  const folder = ".qa/security-remediation/frontend";
  await mkdir(folder, { recursive: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 503, json: { error: "Isolated layout fixture" } }),
  );
  await mockTopKills(page);
  await page.goto("/?region=europe");
  await expect(page.locator(".kill-card")).toHaveCount(3);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    const note = document.createElement("div");
    note.textContent = "LAYOUT QA FIXTURE · ranking and prices are not live";
    note.setAttribute("aria-hidden", "true");
    note.style.cssText =
      "position:fixed;bottom:4px;right:4px;font:11px sans-serif;background:#101014;color:#f2eee9;padding:4px;z-index:999;pointer-events:none";
    document.body.append(note);
  });
  const measurements = [];
  for (const [width, height] of [
    [1440, 900],
    [1920, 1080],
    [768, 1024],
    [390, 844],
    [375, 844],
    [320, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.locator(".landing-kills").scrollIntoViewIfNeeded();
    await page.locator(".landing-kills").evaluate((section) => {
      scrollTo(0, section.getBoundingClientRect().top + scrollY - 24);
    });
    await expect
      .poll(() =>
        page
          .locator(".kill-card")
          .first()
          .locator("img")
          .evaluateAll((images: HTMLImageElement[]) => images.every((image) => image.complete)),
      )
      .toBe(true);
    const measured = await page.locator(".landing-kills").evaluate((section) => {
      const heading = section.querySelector(".landing-section-heading")!;
      const paragraph = heading.querySelector("p")!.getBoundingClientRect();
      const link = heading.querySelector(".pill-link")!.getBoundingClientRect();
      const clipped = [...section.querySelectorAll(".kill-card")].flatMap((card, index) => {
        const boundary = card.getBoundingClientRect();
        return [...card.querySelectorAll(".loadout-board, .kill-loot li")].flatMap((element) => {
          const r = element.getBoundingClientRect();
          return r.left < boundary.left - 1 || r.right > boundary.right + 1
            ? [`card ${index}: ${element.className}`]
            : [];
        });
      });
      return {
        width: innerWidth,
        overflow: document.documentElement.scrollWidth > innerWidth,
        clipped,
        paragraphWidth: paragraph.width,
        headingWidth: heading.getBoundingClientRect().width,
        linkTop: link.top,
        paragraphBottom: paragraph.bottom,
      };
    });
    measurements.push(measured);
    expect(measured.overflow).toBe(false);
    expect(measured.clipped).toEqual([]);
    if (width <= 700) {
      expect(measured.paragraphWidth).toBeGreaterThan(measured.headingWidth * 0.9);
      expect(measured.linkTop).toBeGreaterThanOrEqual(measured.paragraphBottom);
    }
    await page.screenshot({ path: `${folder}/top-kills-${width}.png` });
  }
  await writeFile(`${folder}/top-kills-measurements.json`, JSON.stringify(measurements, null, 2));
  const participantCard = page.locator(".kill-card").nth(1);
  await participantCard.getByRole("button", { name: "Show 4 participants" }).click();
  await expect(
    participantCard.getByRole("button", { name: "Hide 4 participants" }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.locator(".kill-card").nth(1).getByRole("list", { name: "Participants" }),
  ).toBeVisible();
});
