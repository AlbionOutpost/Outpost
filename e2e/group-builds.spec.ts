import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();
test("comps open on their activities, each card opening that activity's comps", async ({
  page,
}) => {
  await page.goto("/compositions?region=asia");
  const tabs = page.getByRole("navigation", { name: "Comp collections" });
  await expect(tabs.getByRole("link", { name: "Activities", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Comps by activity/);
  const activities = page.getByRole("region", { name: "Comp activities" });
  const cards = activities.locator("[data-activity]");
  expect(await cards.count()).toBeGreaterThan(5);
  // Every card names its activity and a real count; none is listed empty
  for (const text of await cards.locator("small").allInnerTexts())
    expect(text).toMatch(/^[\d,]+ comps?$/);
  await expect(page.getByRole("region", { name: "Matching comps" })).toHaveCount(0);
  const zvz = activities.locator('[data-activity="ZVZ"]');
  const count = Number((await zvz.locator("small").innerText()).replace(/\D/g, ""));
  await zvz.getByRole("link").click();
  await expect(page).toHaveURL(/\/compositions\?category=ZVZ/);
  await expect(
    page.getByRole("region", { name: "Matching comps" }).getByText(/^[\d,]+ comps? /),
  ).toHaveText(new RegExp(`^${count.toLocaleString("en-GB")} comps? `));
  await expect(tabs.getByRole("link", { name: "All comps", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  // All comps is one click away and stays the list once its filters are cleared.
  await tabs.getByRole("link", { name: "Activities", exact: true }).click();
  await expect(page).toHaveURL(
    (url) => url.pathname === "/compositions" && url.search === "?region=asia",
  );
  await tabs.getByRole("link", { name: "All comps", exact: true }).click();
  await expect(page).toHaveURL(/\/compositions\?view=all/);
  const list = page.getByRole("region", { name: "Matching comps" });
  await expect(
    list.getByText(/^[\d,]+ comps \([\d,]+ from players · [\d,]+ Group Builds\)/),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Comp activities" })).toHaveCount(0);
  const pages = page.getByRole("navigation", { name: "Comp pages" });
  await pages.getByRole("link", { name: "Next page" }).click();
  await expect(page).toHaveURL(/\/compositions\?page=2/);
  await pages.getByRole("link", { name: "Previous page" }).click();
  await expect(page).toHaveURL(/\/compositions\?page=1/);
  await expect(list).toBeVisible();
  // The old activities URL lands on the same grid, keeping its server.
  const old = await page.request.get("/compositions/activities?region=asia", { maxRedirects: 0 });
  expect(old.status()).toBe(308);
  expect(old.headers().location).toBe("/compositions?region=asia");
  await page.goto("/compositions/activities");
  await expect(page).toHaveURL(/\/compositions$/);
  await expect(page.getByRole("region", { name: "Comp activities" })).toBeVisible();
});
test("group builds are discoverable and retain every member while presentation controls work", async ({
  page,
}) => {
  await page.goto("/compositions?view=all");
  await page
    .getByRole("navigation", { name: "Comp source" })
    .getByRole("link", { name: "Group Builds", exact: true })
    .click();
  await expect(page).toHaveURL(/\/compositions\?source=library/);
  await expect(
    page.getByRole("region", { name: "Matching comps" }).getByText(/^[\d,]+ Group Builds · /),
  ).toBeVisible();
  // The old list URL redirects to the merged list, keeping its filters and server.
  const old = await page.request.get("/compositions/library?q=zvz&page=2&region=asia", {
    maxRedirects: 0,
  });
  expect(old.status()).toBe(308);
  expect(old.headers().location).toBe("/compositions?source=library&q=zvz&page=2&region=asia");
  await page.goto("/compositions/library/dreamteam?region=asia");
  // Starts as one build window per member, each opening that member's build; the roster rows
  // are one click away.
  const members = page.locator("[data-comp-member]");
  await expect(members).toHaveCount(17);
  await expect(page.getByRole("heading", { name: "The party", exact: true })).toBeVisible();
  await expect(members.first().locator(".build-card-loadout")).toBeVisible();
  await expect(members.first().getByRole("link").first()).toHaveAttribute(
    "href",
    /^\/builds\/library\//,
  );
  await page.getByRole("button", { name: "Roster", exact: true }).click();
  await expect(page.getByRole("list", { name: /roster$/ }).getByRole("listitem")).toHaveCount(17);
  await page.getByRole("button", { name: "Abilities", exact: true }).click();
  await expect(page.locator("[data-comp-member]")).toHaveCount(17);
  await expect(page.getByLabel("Slot 1 recorded abilities", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Swaps", exact: true }).click();
  await expect(page.getByLabel("Slot 1 equipment alternatives", { exact: true })).toHaveCount(0);
  // No member of this Group Build records a mount, so there is nothing to show or hide.
  await expect(page.getByRole("button", { name: "Mounts", exact: true })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Recorded mounts", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Copy to my comps", exact: true })).toHaveAttribute(
    "href",
    /fromComposition=dreamteam/,
  );
  await page.getByRole("link", { name: "Copy to my comps", exact: true }).click();
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
    await page.getByRole("link", { name: "Copy to my comps", exact: true }).click();
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
    await expect(page.locator("[data-comp-member]")).toHaveCount(17);
  } finally {
    await outsider.close();
    await db.user.deleteMany({ where: { id } });
  }
});
test.afterAll(() => db.$disconnect());
