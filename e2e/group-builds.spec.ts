import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();
test("group builds are discoverable and retain every member while presentation controls work", async ({
  page,
}) => {
  await page.goto("/compositions");
  await page.getByRole("link", { name: "Group Builds", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Group Builds", exact: true })).toBeVisible();
  await page.goto("/compositions/library/dreamteam?region=asia");
  await expect(page.locator(".library-comp-members > section")).toHaveCount(17);
  await expect(
    page.getByRole("heading", { name: "Builds in this group (17)", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Show equipment instead of abilities", { exact: true }).uncheck();
  await expect(page.getByLabel("Slot 1 recorded abilities", { exact: true })).toBeVisible();
  await page.getByLabel("Show equipment alternatives", { exact: true }).uncheck();
  await expect(page.getByLabel("Slot 1 equipment alternatives", { exact: true })).toHaveCount(0);
  await page.getByLabel("Include recorded mount requirements", { exact: true }).uncheck();
  await expect(
    page.getByRole("heading", { name: "Recorded mount requirements", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Include recorded mount requirements", { exact: true }).check();
  await expect(
    page.getByText("No mount items were recorded for this group build.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Clone group build", exact: true })).toHaveAttribute(
    "href",
    /fromComposition=dreamteam/,
  );
  await page.getByRole("link", { name: "Clone group build", exact: true }).click();
  await expect(page).toHaveURL(/\/signin\?/);
  expect(new URL(page.url()).searchParams.get("callbackUrl")).toContain(
    "fromComposition=dreamteam",
  );
});
test("cloning a public group build saves all positions privately without changing the source", async ({
  page,
  context,
  browser,
}) => {
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  await db.user.create({
    data: {
      id,
      name: "Group copy QA fixture",
      sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
    },
  });
  const outsider = await browser.newContext({ baseURL: "http://localhost:3000" });
  try {
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
    await page.goto("/compositions/library/dreamteam?region=asia");
    await page.getByRole("link", { name: "Clone group build", exact: true }).click();
    await expect(
      page.getByRole("list", { name: "Comp roster", exact: true }).getByRole("listitem"),
    ).toHaveCount(17);
    await page.getByRole("button", { name: "Save comp", exact: true }).click();
    await expect(page).toHaveURL(/\/compositions\/[a-z0-9]+\?region=asia$/);
    const savedId = new URL(page.url()).pathname.split("/").pop()!;
    const saved = await db.composition.findUniqueOrThrow({ where: { id: savedId } });
    expect(saved.authorId).toBe(id);
    expect(saved.visibility).toBe("PRIVATE");
    expect(saved.groupId).toBeNull();
    expect(saved.region).toBe("asia");
    const slots = saved.slots as { id: string; mandatory: boolean }[];
    expect(slots).toHaveLength(17);
    expect(new Set(slots.map((slot) => slot.id)).size).toBe(17);
    expect(slots.filter((slot) => !slot.mandatory)).toHaveLength(10);
    expect((await outsider.request.get(`/api/compositions/${savedId}`)).status()).toBe(404);
    await page.goto("/compositions/library/dreamteam");
    await expect(page.locator(".library-comp-members > section")).toHaveCount(17);
  } finally {
    await outsider.close();
    await db.user.deleteMany({ where: { id } });
  }
});
test.afterAll(() => db.$disconnect());
