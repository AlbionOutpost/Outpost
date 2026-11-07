import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();
const socialBot = { "user-agent": "Twitterbot/1.0" };
const head = (html: string) => html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] || "";

test("public metadata has route-specific canonical/social heads and a real static share image", async ({
  page,
  request,
}) => {
  await page.goto("/tools/market?region=asia&item=T4_MAIN_AXE%401&quality=3&utm_source=qa");
  await expect(page).toHaveTitle("Albion Online market prices | Outpost");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://albionoutpost.com/tools/market?region=asia&item=T4_MAIN_AXE%401&quality=3",
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    "https://albionoutpost.com/tools/market?region=asia&item=T4_MAIN_AXE%401&quality=3",
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  const bot = await request.get("/builds/library/battleaxe-mist-build?region=asia", {
    headers: socialBot,
  });
  expect(bot.status()).toBe(200);
  const markup = head(await bot.text());
  expect(markup).toContain('property="og:title"');
  expect(markup).toContain(
    'property="og:image" content="https://albionoutpost.com/brand/outpost-social.png"',
  );
  expect(markup).toContain(
    'rel="canonical" href="https://albionoutpost.com/builds/library/battleaxe-mist-build?region=asia"',
  );
  const image = await request.get("/brand/outpost-social.png");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");
  const png = await image.body();
  expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).not.toContain("<loc>https://albionoutpost.com/supporter</loc>");
  expect(xml).toContain("https://albionoutpost.com/builds?source=library&amp;category=MISTS_SOLO");
  for (const excluded of [
    "/legal",
    "/premium",
    "/groups",
    "/builds/new",
    "/compositions/new",
    "/tools/death-feed",
    "/dashboard",
    "/settings",
    "/invitations",
    "/api/",
  ]) {
    expect(xml).not.toContain(`<loc>https://albionoutpost.com${excluded}</loc>`);
  }
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Sitemap: https://albionoutpost.com/sitemap.xml");
  const llms = await request.get("/llms.txt");
  expect(llms.status()).toBe(200);
  expect(llms.headers()["content-type"]).toContain("text/plain");
  const summary = await llms.text();
  expect(summary).toMatch(/^# Albion Outpost\n/);
  for (const link of ["/tools", "/builds", "/compositions", "/guides", "/market-data", "/legal"])
    expect(summary).toContain(`(https://albionoutpost.com${link})`);
});

test("social metadata never borrows owner permissions or discloses private, unlisted, hidden or Team records", async ({
  request,
  context,
}) => {
  test.setTimeout(90000);
  const userId = `atlas-test-${randomUUID()}`,
    token = randomUUID(),
    prefix = randomUUID().slice(0, 8);
  const fixture = async (
    visibility: "PUBLIC" | "PRIVATE" | "UNLISTED",
    hiddenAt: Date | null = null,
  ) =>
    db.build.create({
      data: {
        authorId: userId,
        title: `SEO ${visibility} ${prefix}`,
        description: `Source ${visibility} notes ${prefix}`,
        contentType: "Solo Mists",
        region: "europe",
        visibility,
        hiddenAt,
        strategy: "",
        patchNotes: "",
      },
    });
  await db.user.create({
    data: {
      id: userId,
      name: "SEO isolated fixture",
      sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
    },
  });
  let groupId: string | undefined;
  try {
    const published = await fixture("PUBLIC"),
      privateBuild = await fixture("PRIVATE"),
      unlisted = await fixture("UNLISTED"),
      hidden = await fixture("PUBLIC", new Date());
    const group = await db.group.create({
      data: {
        name: `PRIVATE_TEAM_${prefix}`,
        slug: `seo-${prefix}`,
        description: "Private fixture",
        region: "europe",
        ownerId: userId,
        visibility: "PRIVATE",
      },
    });
    groupId = group.id;
    const slots = [
      {
        id: randomUUID(),
        playerName: "",
        role: "Tank",
        customRole: "",
        mandatory: true,
        substitute: "",
        notes: "",
        sourceBuildId: null,
        equipment: [],
        equipmentSets: [],
      },
    ];
    const publishedComp = await db.composition.create({
      data: {
        authorId: userId,
        title: `Public composition ${prefix}`,
        description: "Public composition notes",
        region: "europe",
        contentType: "Small Scale",
        visibility: "PUBLIC",
        groupId: null,
        notes: "",
        slots,
      },
    });
    const teamComp = await db.composition.create({
      data: {
        authorId: userId,
        title: `TEAM_SECRET_${prefix}`,
        description: `TEAM_NOTES_${prefix}`,
        region: "europe",
        contentType: "Small Scale",
        visibility: "GROUP",
        groupId,
        notes: "",
        slots,
      },
    });
    for (const [path, title] of [
      [`/builds/${published.id}`, published.title],
      [`/compositions/${publishedComp.id}`, publishedComp.title],
    ]) {
      const response = await request.get(path, { headers: socialBot });
      expect(response.status()).toBe(200);
      const markup = head(await response.text());
      expect(markup).toContain(`property="og:title" content="${title} | Outpost"`);
      expect(markup).toContain('name="robots" content="index, follow"');
    }
    for (const row of [privateBuild, unlisted, hidden]) {
      const response = await request.get(`/builds/${row.id}`, { headers: socialBot });
      const markup = head(await response.text());
      expect(markup).not.toContain(row.title);
      expect(markup).not.toContain(row.description);
      expect(markup).toContain("noindex");
      expect(markup).toContain("nosnippet");
    }
    const team = await request.get(`/compositions/${teamComp.id}`, { headers: socialBot });
    const teamHead = head(await team.text());
    expect(teamHead).not.toContain(teamComp.title);
    expect(teamHead).not.toContain(teamComp.description);
    expect(teamHead).not.toContain(group.name);
    expect(teamHead).toContain("noindex");
    // The owner can read their private UI, but the share head is still anonymous/generic.
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
    const owner = await context.request.get(`/builds/${privateBuild.id}`, { headers: socialBot });
    expect(owner.status()).toBe(200);
    const ownerHtml = await owner.text();
    expect(ownerHtml).toContain(privateBuild.title);
    expect(head(ownerHtml)).not.toContain(privateBuild.title);
    expect(head(ownerHtml)).toContain("nosnippet");
    // Current visibility is checked again after a successful public request; no stale shared preview.
    await db.build.update({ where: { id: published.id }, data: { visibility: "PRIVATE" } });
    const revoked = await request.get(`/builds/${published.id}`, { headers: socialBot });
    expect(head(await revoked.text())).not.toContain(published.title);
    expect((await db.build.findUnique({ where: { id: privateBuild.id } }))?.visibility).toBe(
      "PRIVATE",
    );
  } finally {
    await db.composition.deleteMany({ where: { authorId: userId } });
    if (groupId) await db.group.deleteMany({ where: { id: groupId, ownerId: userId } });
    await db.user.deleteMany({ where: { id: userId } });
  }
});
