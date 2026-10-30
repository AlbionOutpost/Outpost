import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();
test("community favorites, votes, comments and moderation enforce independent-account permissions", async ({
  browser,
}) => {
  const contexts = await Promise.all(Array.from({ length: 4 }, () => browser.newContext()));
  const users = Array.from({ length: 4 }, () => `atlas-test-${randomUUID()}`);
  let buildId = "",
    privateId = "",
    groupId = "";
  try {
    for (let n = 0; n < 4; n++) {
      const token = randomUUID();
      await db.user.create({
        data: {
          id: users[n],
          name: `Community tester ${n}`,
          role: n === 3 ? "MODERATOR" : "USER",
          sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
        },
      });
      await contexts[n].addCookies([
        {
          name: "next-auth.session-token",
          value: token,
          domain: "localhost",
          path: "/",
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);
    }
    const input = {
      authorId: users[0],
      title: "Community verified build",
      description: "Original browser fixture",
      contentType: "Solo Mists",
      region: "europe",
      visibility: "PUBLIC" as const,
      strategy: "",
      patchNotes: "",
    };
    const build = await db.build.create({ data: input });
    buildId = build.id;
    const priv = await db.build.create({
      data: { ...input, title: "Private fixture", visibility: "PRIVATE" },
    });
    privateId = priv.id;
    const post = (n: number, data: unknown, id = buildId) =>
      contexts[n].request.post(`/api/community/build/${id}`, {
        headers: { origin: "http://localhost:3000" },
        data,
      });
    expect((await post(1, { action: "favorite", active: true }, privateId)).status()).toBe(404);
    expect((await contexts[1].request.get(`/api/community/build/${privateId}`)).status()).toBe(404);
    expect((await post(0, { action: "vote", active: true })).status()).toBe(400);
    const page = await contexts[1].newPage();
    await page.goto(`/builds/${buildId}`);
    await page.getByRole("button", { name: "Add favorite (0)", exact: true }).click();
    await expect(page.getByText("Saved to favorites.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Upvote build (0)", exact: true }).click();
    await expect(page.getByText("Vote recorded.", { exact: true })).toBeVisible();
    expect((await post(1, { action: "vote", active: true })).status()).toBe(200);
    expect(await db.buildVote.count({ where: { buildId, userId: users[1] } })).toBe(1);
    await page
      .getByLabel("Community comment", { exact: true })
      .fill("Helpful observation <img src=x onerror=alert(1)>");
    await page.getByRole("button", { name: "Post comment", exact: true }).click();
    await expect(page.getByText("Comment posted.", { exact: true })).toBeVisible();
    const comment = await db.contentComment.findFirstOrThrow({
      where: { buildId, authorId: users[1] },
    });
    expect(await page.locator("main img:not([data-albion-icon])").count()).toBe(0);
    expect(
      (
        await post(2, {
          action: "edit-comment",
          commentId: comment.id,
          version: 1,
          body: "Unauthorized edit",
        })
      ).status(),
    ).toBe(404);
    await page.getByRole("button", { name: "Edit comment", exact: true }).click();
    await page
      .getByLabel("Community comment", { exact: true })
      .fill("Updated original observation");
    await page.getByRole("button", { name: "Save comment revision", exact: true }).click();
    await expect(page.getByText("Comment updated.", { exact: true })).toBeVisible();
    expect(await db.commentRevision.count({ where: { commentId: comment.id } })).toBe(2);
    expect(
      (
        await post(1, {
          action: "edit-comment",
          commentId: comment.id,
          version: 1,
          body: "Stale update attempt",
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await contexts[2].request.get(`/api/community/build/${buildId}?history=${comment.id}`)
      ).status(),
    ).toBe(403);
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Remove favorite (1)", exact: true }),
    ).toBeVisible();
    await page.goto("/favorites");
    await expect(
      page.getByRole("link", { name: "Community verified build", exact: true }),
    ).toBeVisible();
    expect(
      (
        await post(2, { action: "report", reason: "Report for reviewed browser verification" })
      ).status(),
    ).toBe(200);
    const report = await db.contentReport.findFirstOrThrow({ where: { buildId, status: "OPEN" } });
    const review = {
      reportId: report.id,
      version: 1,
      action: "hide",
      note: "Validated moderation test rationale",
    };
    expect((await contexts[2].request.get("/api/admin/reports")).status()).toBe(403);
    expect(
      (
        await contexts[2].request.post("/api/admin/reports", {
          headers: { origin: "http://localhost:3000" },
          data: { ...review, role: "ADMIN" },
        })
      ).status(),
    ).toBe(403);
    const admin = await contexts[3].newPage();
    await admin.goto("/admin/reports");
    await admin.getByRole("button", { name: "Load moderation queue", exact: true }).click();
    await admin.getByLabel("Review rationale (required)", { exact: true }).fill(review.note);
    const card = admin.locator("article").filter({
      has: admin.getByRole("heading", { name: "Community verified build", exact: true }),
    });
    await card.getByRole("button", { name: "Hide reported content", exact: true }).click();
    await expect(
      admin.getByText("Moderation action saved and audited.", { exact: true }),
    ).toBeVisible();
    expect((await contexts[2].request.get(`/api/builds/${buildId}`)).status()).toBe(404);
    expect(
      (
        await contexts[2].request.get(
          `/api/builds/${buildId}/cost?region=europe&city=Lymhurst&sets=1`,
        )
      ).status(),
    ).toBe(404);
    expect((await contexts[2].request.get(`/api/community/build/${buildId}`)).status()).toBe(404);
    expect(await db.moderationLog.count({ where: { targetId: buildId } })).toBe(1);
    await page.goto("/favorites");
    await expect(
      page.getByRole("link", { name: "Community verified build", exact: true }),
    ).toHaveCount(0);
    expect(
      (
        await contexts[3].request.post("/api/admin/reports", {
          headers: { origin: "http://localhost:3000" },
          data: review,
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await contexts[3].request.post("/api/admin/reports", {
          headers: { origin: "http://localhost:3000" },
          data: { ...review, version: 2, action: "restore" },
        })
      ).status(),
    ).toBe(200);
    expect((await contexts[2].request.get(`/api/builds/${buildId}`)).status()).toBe(200);

    const group = await db.group.create({
      data: {
        name: "Private favorite guild",
        slug: `fav-${randomUUID().slice(0, 8)}`,
        description: "Private fixture",
        region: "europe",
        visibility: "PRIVATE",
        ownerId: users[0],
        members: {
          create: [
            { userId: users[0], role: "OWNER" },
            { userId: users[1], role: "MEMBER" },
          ],
        },
      },
    });
    groupId = group.id;
    expect((await contexts[2].request.get(`/api/groups/${group.id}`)).status()).toBe(404);
    const privatePage = await contexts[2].newPage();
    await privatePage.goto(`/groups/${group.slug}`);
    await expect(
      privatePage.getByRole("heading", { name: "Private favorite guild", exact: true }),
    ).toHaveCount(0);
    await expect(
      privatePage.getByRole("heading", { name: "Page not found.", exact: true }),
    ).toBeVisible();
    const composition = await db.composition.create({
      data: {
        authorId: users[0],
        groupId: group.id,
        title: "Private group favorite",
        description: "",
        region: "europe",
        contentType: "ZvZ",
        visibility: "GROUP",
        notes: "",
        slots: [
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
          },
        ],
      },
    });
    const outsideSearch = await (await contexts[2].request.get("/api/search?q=Private")).json();
    expect(
      outsideSearch.results.some((r: { url: string }) =>
        [
          `/groups/${group.slug}`,
          `/compositions/${composition.id}`,
          `/builds/${privateId}`,
        ].includes(r.url),
      ),
    ).toBe(false);
    const ownSearch = await (await contexts[0].request.get("/api/search?q=Private")).json();
    expect(
      ownSearch.results.some((r: { url: string }) => r.url === `/compositions/${composition.id}`),
    ).toBe(true);
    await expect(
      db.contentComment.create({
        data: {
          authorId: users[1],
          buildId,
          compositionId: composition.id,
          body: "Two targets are invalid",
        },
      }),
    ).rejects.toThrow();
    const favoriteUrl = `/api/community/composition/${composition.id}`;
    expect(
      (
        await contexts[1].request.post(favoriteUrl, {
          headers: { origin: "http://localhost:3000" },
          data: { action: "favorite", active: true },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await contexts[2].request.post(favoriteUrl, {
          headers: { origin: "http://localhost:3000" },
          data: { action: "favorite", active: true },
        })
      ).status(),
    ).toBe(404);
    await db.groupMember.delete({
      where: { groupId_userId: { groupId: group.id, userId: users[1] } },
    });
    expect((await contexts[1].request.get(favoriteUrl)).status()).toBe(404);
    await page.goto("/favorites");
    await expect(
      page.getByRole("link", { name: "Private group favorite", exact: true }),
    ).toHaveCount(0);
    const exported = await (await contexts[1].request.get("/api/account/export")).json();
    expect(exported.profile.comments[0].revisions).toHaveLength(2);
    expect(
      exported.profile.buildFavorites.some((f: { buildId: string }) => f.buildId === buildId),
    ).toBe(true);
    expect(
      (await post(1, { action: "delete-comment", commentId: comment.id, version: 2 })).status(),
    ).toBe(200);
    expect(
      (await (await contexts[1].request.get(`/api/community/build/${buildId}`)).json()).comments,
    ).toHaveLength(0);
    await db.user.update({ where: { id: users[3] }, data: { role: "USER" } });
    expect((await contexts[3].request.get("/api/admin/reports")).status()).toBe(403);
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
    await db.moderationLog.deleteMany({ where: { targetId: buildId } });
    if (groupId) await db.group.deleteMany({ where: { id: groupId } });
    await db.user.deleteMany({ where: { id: { in: users } } });
  }
});
