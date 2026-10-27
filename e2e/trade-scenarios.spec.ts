import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { createTestDb } from "./support/db";
import { initialTransport } from "../src/lib/albion/transport";
import { initialProduction } from "../src/lib/albion/production";
const db = createTestDb();
test("manual trade thresholds persist privately and remain available beyond other calculator records", async ({
  page,
  context,
  browser,
}) => {
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  await db.user.create({
    data: {
      id,
      name: "Trade QA fixture",
      sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
    },
  });
  await context.addCookies([
    {
      name: "next-auth.session-token",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  try {
    await page.goto("/tools/flipping?region=europe");
    for (const [label, value] of [
      ["Purchase price per item", "100"],
      ["Sale price per item", "150"],
      ["Quantity", "10"],
      ["Sales tax (%)", "8"],
      ["Sell order setup fee (%)", "2.5"],
      ["Total transport / risk cost", "50"],
    ])
      await page.getByLabel(label, { exact: true }).fill(value);
    await expect(page.locator(".panel.result > strong")).toContainText("292.5");
    await expect(
      page.locator(".panel.result dl > div").filter({ hasText: "Break-even sale per item" }),
    ).toContainText("117.32");
    await expect(
      page
        .locator(".panel.result dl > div")
        .filter({ hasText: "Minimum profitable whole-silver sale" }),
    ).toContainText("118");
    await page.getByLabel("Scenario title", { exact: true }).fill("QA saved manual trade");
    await page.getByRole("button", { name: "Save new scenario", exact: true }).click();
    await expect(page.getByText("Scenario saved to your account.", { exact: true })).toBeVisible();
    const saved = await db.savedScenario.findFirstOrThrow({
      where: { authorId: id, kind: "flipping" },
    });
    await db.savedScenario.create({
      data: {
        authorId: id,
        title: "Older QA transport plan",
        kind: "transporting",
        configuration: initialTransport("europe"),
      },
    });
    await db.savedScenario.createMany({
      data: Array.from({ length: 51 }, (_, i) => ({
        authorId: id,
        title: `Other QA crafting scenario ${i}`,
        kind: "crafting",
        configuration: initialProduction("crafting", "europe"),
      })),
    });
    await page.reload();
    await page.getByRole("button", { name: "Load saved scenarios", exact: true }).click();
    await page.getByRole("button", { name: "Restore QA saved manual trade", exact: true }).click();
    await expect(page.getByLabel("Quantity", { exact: true })).toHaveValue("10");
    await expect(page.locator(".panel.result > strong")).toContainText("292.5");
    const guest = await browser.newContext();
    try {
      expect((await guest.request.get("/api/scenarios?kind=flipping")).status()).toBe(401);
      expect(
        (
          await guest.request.delete(`/api/scenarios/${saved.id}`, {
            headers: { origin: "http://localhost:3000" },
          })
        ).status(),
      ).toBe(401);
      const outsiderId = `atlas-test-${randomUUID()}`,
        outsiderToken = randomUUID();
      await db.user.create({
        data: {
          id: outsiderId,
          name: "Trade outsider QA",
          sessions: {
            create: { sessionToken: outsiderToken, expires: new Date(Date.now() + 600000) },
          },
        },
      });
      try {
        await guest.addCookies([
          {
            name: "next-auth.session-token",
            value: outsiderToken,
            domain: "localhost",
            path: "/",
            httpOnly: true,
            sameSite: "Lax",
          },
        ]);
        const list = await guest.request.get("/api/scenarios?kind=flipping");
        expect(list.status()).toBe(200);
        expect(await list.json()).toEqual([]);
        expect(
          (
            await guest.request.delete(`/api/scenarios/${saved.id}`, {
              headers: { origin: "http://localhost:3000" },
            })
          ).status(),
        ).toBe(404);
      } finally {
        await db.user.delete({ where: { id: outsiderId } });
      }
    } finally {
      await guest.close();
    }
    expect((await context.request.get("/api/scenarios?kind=invalid")).status()).toBe(400);
    const exported = await context.request.get("/api/account/export");
    expect(
      (await exported.json()).profile.savedScenarios.some((s: { id: string }) => s.id === saved.id),
    ).toBe(true);
    await mkdir(".qa/release-blockers/trade", { recursive: true });
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        scrollTo(0, 0);
      });
      await page.screenshot({
        path: `.qa/release-blockers/trade/manual-${width}.png`,
        fullPage: true,
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    await page.getByLabel("Purchase execution", { exact: true }).selectOption("buy-order");
    await page.getByLabel("Purchase order setup fee (%)", { exact: true }).fill("2.5");
    await expect(page.locator(".panel.result > strong")).toContainText("267.5");
    await expect(
      page.locator(".panel.result dl > div").filter({ hasText: "Purchase order setup cost" }),
    ).toContainText("25");
    await expect(
      page
        .locator(".panel.result dl > div")
        .filter({ hasText: "Minimum profitable whole-silver sale" }),
    ).toContainText("121");
    await page.getByLabel("Scenario title", { exact: true }).fill("QA purchase order trade");
    await page.getByRole("button", { name: "Save new scenario", exact: true }).click();
    await expect(page.getByText("Scenario saved to your account.", { exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Load saved scenarios", exact: true }).click();
    await page
      .getByRole("button", { name: "Restore QA purchase order trade", exact: true })
      .click();
    await expect(page.getByLabel("Purchase execution", { exact: true })).toHaveValue("buy-order");
    await expect(page.getByLabel("Purchase order setup fee (%)", { exact: true })).toHaveValue(
      "2.5",
    );
    await expect(page.locator(".panel.result > strong")).toContainText("267.5");
    await expect(
      page.locator(".panel.result dl > div").filter({ hasText: "Purchase order setup cost" }),
    ).toContainText("25");
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        scrollTo(0, 0);
      });
      await page.screenshot({
        path: `.qa/release-blockers/trade/purchase-order-${width}.png`,
        fullPage: true,
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    await page.goto("/tools/transporting");
    await page.getByRole("button", { name: "Load transport plans", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Restore Older QA transport plan", exact: true }),
    ).toBeVisible();
  } finally {
    await db.user.delete({ where: { id } });
  }
});
