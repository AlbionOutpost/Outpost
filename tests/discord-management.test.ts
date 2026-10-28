import { describe, it, expect, vi } from "vitest";
import { discordRequest, assertOutpostIdentity } from "../scripts/discord-client.mjs";
const credentials = { token: "fixture" + "x".repeat(40) };
describe("owner-authorized Discord profile management", () => {
  it("keeps bot authentication on the fixed Discord origin with redirects disabled", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response(JSON.stringify({ id: "fixture", bot: true })),
    );
    await discordRequest("GET", "/users/@me", undefined, { credentials, fetch });
    expect(fetch.mock.calls[0][0]).toBe("https://discord.com/api/v10/users/@me");
    expect(fetch.mock.calls[0][1]).toMatchObject({
      headers: { Authorization: `Bot ${credentials.token}` },
      redirect: "error",
    });
  });
  it("rejects messages, guild changes, foreign URLs and unsupported methods before sending", async () => {
    const fetch = vi.fn();
    for (const [method, path] of [
      ["GET", "https://evil.example"],
      ["PATCH", "/applications/other"],
      ["POST", "/users/@me"],
      ["PATCH", "/channels/fixture/messages"],
      ["GET", "/users/@me?redirect=evil"],
    ])
      await expect(discordRequest(method, path, undefined, { credentials, fetch })).rejects.toThrow(
        /own documented/,
      );
    expect(fetch).not.toHaveBeenCalled();
  });
  it("never echoes reflected credentials in permission errors", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () =>
        new Response(JSON.stringify({ code: 50013, message: credentials.token }), { status: 403 }),
    );
    await expect(
      discordRequest("PATCH", "/applications/@me", {}, { credentials, fetch }),
    ).rejects.toThrow("HTTP 403; code: 50013");
    try {
      await discordRequest("PATCH", "/applications/@me", {}, { credentials, fetch });
    } catch (error) {
      expect(String(error)).not.toContain(credentials.token);
    }
  });
  it("requires an actual bot matching this project's application before any mutation", () => {
    expect(() =>
      assertOutpostIdentity({ id: "fixture", bot: true }, { id: "fixture", name: "Outpost" }),
    ).not.toThrow();
    for (const [user, app] of [
      [
        { id: "fixture", bot: false },
        { id: "fixture", name: "Outpost" },
      ],
      [
        { id: "fixture", bot: true },
        { id: "other", name: "Outpost" },
      ],
      [
        { id: "fixture", bot: true },
        { id: "fixture", name: "Other Project" },
      ],
    ])
      expect(() => assertOutpostIdentity(user, app)).toThrow(/Refusing/);
  });
});
