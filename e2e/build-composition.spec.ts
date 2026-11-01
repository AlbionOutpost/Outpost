import { test, expect, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();
async function fixtureUser(context: BrowserContext, name: string) {
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  await db.user.create({
    data: {
      id,
      name,
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
  return id;
}
function sourceData(authorId: string, title: string, visibility: "PUBLIC" | "PRIVATE" = "PUBLIC") {
  return {
    authorId,
    title,
    description: "Original description",
    contentType: "Solo Mists",
    region: "europe",
    visibility,
    strategy: "Original strategy",
    patchNotes: "",
    equipmentSets: [
      {
        id: randomUUID(),
        name: "Original spare",
        equipment: [
          {
            slot: "Main hand",
            itemId: "T4_MAIN_AXE",
            quality: 3,
            abilities: { E: "Blood Bandit" },
            alternatives: [],
          },
        ],
      },
    ],
    equipment: {
      create: [
        {
          slot: "Main hand",
          itemId: "T4_MAIN_AXE",
          quality: 3,
          abilities: "Unvalidated author reminder",
          alternatives: "Author swap note",
          abilitySelections: { E: "Blood Bandit" },
          alternativeItemIds: ["T4_MAIN_AXE@1"],
        },
        {
          slot: "Off hand",
          itemId: "T4_OFF_SHIELD",
          quality: 2,
          abilities: "",
          alternatives: "",
          abilitySelections: {},
          alternativeItemIds: [],
        },
      ],
    },
  };
}
test("build-to-comp copies public and own private loadouts independently while outsiders fail closed", async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(90000);
  const duplicateKeys: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /same key|unique.*key/i.test(message.text()))
      duplicateKeys.push(message.text());
  });
  const ownerContext = await browser.newContext({ baseURL: "http://localhost:3000" }),
    guest = await browser.newContext({ baseURL: "http://localhost:3000" });
  let owner = "",
    reader = "";
  try {
    owner = await fixtureUser(ownerContext, "Build source owner");
    reader = await fixtureUser(context, "Comp copy reader");
    const source = await db.build.create({
        data: sourceData(owner, `Comp bridge ${randomUUID().slice(0, 8)}`),
        include: { equipment: true },
      }),
      before = JSON.stringify(source),
      beforeCount = await db.composition.count({ where: { authorId: reader } });
    await page.goto(`/compositions/new?fromBuild=${source.id}&region=asia`);
    await expect(page.getByLabel("Comp title", { exact: true })).toHaveValue(
      `${source.title} comp`,
    );
    await expect(
      page.getByText("An independent private composition draft is ready.", { exact: false }),
    ).toBeVisible();
    expect(await db.composition.count({ where: { authorId: reader } })).toBe(beforeCount);
    await page.getByRole("button", { name: /^Configure member 1\b/ }).click();
    const existingNotes = "Existing member reminder. ".repeat(79).slice(0, 1980);
    await test.step(
      "Keep existing member notes before copying a saved build",
      async () => {
        const field = page
          .getByRole("dialog", { name: "Edit member 1", exact: true })
          .getByRole("textbox", { name: "Member notes", exact: true });
        await field.fill(existingNotes, { timeout: 10000 });
        await expect(field).toHaveValue(existingNotes);
      },
      { timeout: 15000 },
    );
    await test.step("Copy source loadout into an existing member", async () => {
      await page.getByLabel("Copy loadout from build", { exact: true }).selectOption(source.id);
    });
    await expect(page.getByRole("textbox", { name: "Member notes", exact: true })).toHaveValue(
      [
        existingNotes,
        "Main hand author ability notes: Unvalidated author reminder\nMain hand author alternative notes: Author swap note",
      ]
        .join("\n")
        .slice(0, 2000),
    );
    await page.getByRole("button", { name: "Done editing member", exact: true }).click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Combined member notes were shortened to 2,000 characters" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Save comp", exact: true }).click();
    await expect(page).toHaveURL(/\/compositions\/[^/?]+\?region=asia$/);
    const copyId = new URL(page.url()).pathname.split("/").pop()!,
      copy = await db.composition.findUniqueOrThrow({ where: { id: copyId } }),
      slots = copy.slots as unknown as {
        role: string;
        customRole: string;
        sourceBuildId: string | null;
        equipment: {
          itemId: string;
          quality: number;
          abilities: Record<string, string>;
          alternatives: string[];
        }[];
        equipmentSets: { id: string; name: string }[];
      }[];
    expect(copy).toMatchObject({
      authorId: reader,
      visibility: "PRIVATE",
      groupId: null,
      region: "asia",
    });
    expect(slots).toHaveLength(1);
    expect(slots[0]).toMatchObject({
      role: "Custom",
      customRole: "Unassigned",
      sourceBuildId: source.id,
    });
    expect(slots[0].equipment[0]).toMatchObject({
      itemId: "T4_MAIN_AXE",
      quality: 3,
      abilities: { E: "Blood Bandit" },
      alternatives: ["T4_MAIN_AXE@1"],
    });
    expect(slots[0].equipmentSets[0].id).not.toBe((source.equipmentSets as { id: string }[])[0].id);
    expect((await guest.request.get(`/api/compositions/${copyId}`)).status()).toBe(404);
    expect(
      JSON.stringify(
        await db.build.findUniqueOrThrow({
          where: { id: source.id },
          include: { equipment: true },
        }),
      ),
    ).toBe(before);
    const privateSource = await db.build.create({
      data: sourceData(owner, `Private bridge ${randomUUID().slice(0, 8)}`, "PRIVATE"),
    });
    expect(
      (await context.request.get(`/api/compositions/loadout?id=${privateSource.id}`)).status(),
    ).toBe(404);
    await page.goto(`/compositions/new?fromBuild=${privateSource.id}&region=asia`);
    await expect(page.locator(".composition-editor-page [role=alert]")).toContainText(
      "Build not found",
    );
    await expect(page.locator("body")).not.toContainText(privateSource.title);
    await expect(page.getByRole("link", { name: "Browse builds", exact: true })).toHaveAttribute(
      "href",
      "/builds/library?region=asia",
    );
    await expect(
      page.getByRole("link", { name: "Start an empty composition", exact: true }),
    ).toHaveAttribute("href", "/compositions/new?region=asia");
    await page.getByRole("link", { name: "Start an empty composition", exact: true }).click();
    await expect(page).toHaveURL(/\/compositions\/new\?region=asia$/);
    await page.getByText("Sharing, region & description", { exact: true }).click();
    await expect(page.getByLabel("Comp region", { exact: true })).toHaveValue("asia");
    expect(await db.composition.count({ where: { authorId: reader } })).toBe(beforeCount + 1);
    const ownPage = await ownerContext.newPage();
    await ownPage.goto(
      `/compositions/new?fromBuild=${privateSource.id}&region=americas&role=Healer`,
    );
    await expect(ownPage.getByLabel("Comp title", { exact: true })).toHaveValue(
      `${privateSource.title} comp`,
    );
    await ownPage.getByRole("button", { name: "Save comp", exact: true }).click();
    await expect(ownPage).toHaveURL(/\/compositions\/[^/?]+\?region=americas$/);
    const ownId = new URL(ownPage.url()).pathname.split("/").pop()!,
      ownCopy = await db.composition.findUniqueOrThrow({ where: { id: ownId } });
    expect(
      (ownCopy.slots as unknown as { role: string; sourceBuildId: string }[])[0],
    ).toMatchObject({ role: "Healer", sourceBuildId: privateSource.id });
    expect(ownCopy.visibility).toBe("PRIVATE");
    const revoked = await db.build.create({
      data: sourceData(owner, `Revoked bridge ${randomUUID().slice(0, 8)}`),
    });
    await page.goto(`/compositions/new?fromBuild=${revoked.id}&region=asia`);
    await expect(page.getByLabel("Comp title", { exact: true })).toHaveValue(
      `${revoked.title} comp`,
    );
    await db.build.update({ where: { id: revoked.id }, data: { visibility: "PRIVATE" } });
    await page.getByRole("button", { name: "Save comp", exact: true }).click();
    await expect(page.locator(".party-editor").getByRole("alert")).toContainText(
      "attached build is not accessible",
    );
    expect(await db.composition.count({ where: { authorId: reader } })).toBe(beforeCount + 1);
    expect(duplicateKeys).toEqual([]);
  } finally {
    if (reader) await db.user.delete({ where: { id: reader } });
    if (owner) await db.user.delete({ where: { id: owner } });
    await ownerContext.close();
    await guest.close();
  }
});
test("library Add to comp preserves sign-in return, explicit role and an unattached private copy", async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(60000);
  const anonymous = await browser.newContext({ baseURL: "http://localhost:3000" });
  let userId = "";
  try {
    const guest = await anonymous.newPage();
    await guest.goto("/builds/library/battleaxe-mist-build?region=asia");
    const sourceTitle = (await guest.getByRole("heading", { level: 1 }).textContent()) as string;
    await guest.getByRole("link", { name: "Add to comp", exact: true }).click();
    await expect(guest).toHaveURL(/\/signin\?callbackUrl=/);
    const callback = new URL(guest.url()).searchParams.get("callbackUrl")!;
    expect(callback).toBe("/compositions/new?fromLibrary=battleaxe-mist-build&region=asia");
    userId = await fixtureUser(context, "Library comp planner");
    const serverResponse = await context.request.get(callback + "&role=Support");
    expect(serverResponse.status()).toBe(200);
    const serverHtml = await serverResponse.text();
    // Actual rendered server HTML must prevent a native submit before client
    // handlers attach. The original immediate browser Save below stays intact.
    expect(serverHtml).toMatch(
      /<form\b(?=[^>]*class="[^"]*party-editor)(?=[^>]*method="post")[^>]*>/,
    );
    expect(serverHtml).toMatch(
      /<fieldset\b(?=[^>]*class="[^"]*composition-ready-guard)(?=[^>]*\bdisabled)[^>]*>/,
    );
    expect(await db.composition.count({ where: { authorId: userId } })).toBe(0);
    await page.goto(`/signin?callbackUrl=${encodeURIComponent(callback + "&role=Support")}`);
    await expect(page).toHaveURL(/\/compositions\/new\?/);
    await expect(page.getByLabel("Comp title", { exact: true })).toHaveValue(
      `${sourceTitle} comp`.slice(0, 100),
    );
    expect(await db.composition.count({ where: { authorId: userId } })).toBe(0);
    await page.getByRole("button", { name: "Save comp", exact: true }).click();
    await expect(page).toHaveURL(/\/compositions\/[^/?]+\?region=asia$/);
    const id = new URL(page.url()).pathname.split("/").pop()!,
      copy = await db.composition.findUniqueOrThrow({ where: { id } }),
      slot = (
        copy.slots as unknown as {
          sourceBuildId: string | null;
          role: string;
          equipment: { itemId: string }[];
          equipmentSets: unknown[];
        }[]
      )[0];
    expect(copy).toMatchObject({
      visibility: "PRIVATE",
      groupId: null,
      region: "asia",
      authorId: userId,
    });
    expect(slot).toMatchObject({ sourceBuildId: null, role: "Support" });
    expect(slot.equipment.some((item) => item.itemId === "T8_MAIN_AXE")).toBe(true);
    expect(slot.equipmentSets.length).toBeGreaterThan(0);
    expect((await anonymous.request.get(`/api/compositions/${id}`)).status()).toBe(404);
    await page.goto("/signin?callbackUrl=https%3A%2F%2Fattacker.invalid%2Fcompositions%2Fnew");
    await expect(page).toHaveURL(/\/settings$/);
  } finally {
    if (userId) await db.user.delete({ where: { id: userId } });
    await anonymous.close();
  }
});
