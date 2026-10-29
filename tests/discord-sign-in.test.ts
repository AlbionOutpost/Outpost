import { describe, expect, it, vi } from "vitest";
import { startDiscordSignIn } from "../src/lib/discord-sign-in";
import { signInErrorMessage } from "../src/lib/sign-in-error";
import { safeSignInPageReturn, safeSignInReturn } from "../src/lib/sign-in-return";
const origin = "https://albionoutpost.com";
const callback = "/compositions/new?fromLibrary=battleaxe-mist-build&region=asia";
function authorize(patch: Record<string, string> = {}) {
  return (
    "https://discord.com/api/oauth2/authorize?" +
    new URLSearchParams({
      client_id: "1564994799722045560",
      redirect_uri: origin + "/api/auth/callback/discord",
      scope: "identify email",
      response_type: "code",
      state: "state-fixture",
      code_challenge: "pkce-fixture",
      code_challenge_method: "S256",
      ...patch,
    })
  );
}
const json = (body: unknown, status = 200) => Response.json(body, { status });
function responses(final = json({ url: authorize() })) {
  return [
    json({ discord: { id: "discord", type: "oauth" } }),
    json({ csrfToken: "csrf-fixture" }),
    final,
  ];
}
describe("Discord sign-in startup", () => {
  it("uses existing same-origin NextAuth endpoints, CSRF and approved callback before provider navigation", async () => {
    const queue = responses(),
      fetcher = vi.fn().mockImplementation(async () => queue.shift());
    expect(await startDiscordSignIn(callback, origin, fetcher)).toBe(authorize());
    expect(fetcher.mock.calls.map(([path]) => path)).toEqual([
      "/api/auth/providers",
      "/api/auth/csrf",
      "/api/auth/signin/discord",
    ]);
    const options = fetcher.mock.calls[2][1];
    expect(options.credentials).toBe("same-origin");
    expect(options.redirect).toBe("error");
    expect(options.method).toBe("POST");
    expect(Object.fromEntries(options.body)).toEqual({
      csrfToken: "csrf-fixture",
      callbackUrl: callback,
      json: "true",
    });
  });
  it.each([0, 1, 2])(
    "keeps a failed429 at stage%i on the page instead of navigating to callback",
    async (stage) => {
      const queue = responses();
      queue[stage] = json({ error: "Budget exhausted" }, 429);
      const fetcher = vi.fn().mockImplementation(async () => queue.shift());
      await expect(startDiscordSignIn(callback, origin, fetcher)).rejects.toThrow("Wait a minute");
      expect(fetcher).toHaveBeenCalledTimes(stage + 1);
    },
  );
  it.each([503, 400])(
    "does not treat HTTP%i JSON without url as successful OAuth",
    async (status) => {
      const queue = responses(json({ error: "Private diagnostic" }, status));
      await expect(
        startDiscordSignIn(callback, origin, async () => queue.shift()!),
      ).rejects.toThrow("temporarily unavailable");
    },
  );
  it("requires a configured provider and valid CSRF response before sending a sign-in request", async () => {
    const fetcher = vi.fn().mockResolvedValue(json({}));
    await expect(startDiscordSignIn(callback, origin, fetcher)).rejects.toThrow(
      "temporarily unavailable",
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    const queue = responses();
    queue[1] = json({ csrfToken: "" });
    const missingCsrf = vi.fn().mockImplementation(async () => queue.shift());
    await expect(startDiscordSignIn(callback, origin, missingCsrf)).rejects.toThrow(
      "temporarily unavailable",
    );
    expect(missingCsrf).toHaveBeenCalledTimes(2);
  });
  it.each([
    "https://attacker.invalid/",
    "javascript:alert(1)",
    "//attacker.invalid/",
    origin + "/settings",
    authorize({ redirect_uri: "https://attacker.invalid/callback" }),
    authorize({ state: "" }),
    authorize({ code_challenge_method: "plain" }),
    authorize({ scope: "identify email guilds" }),
    authorize({ client_id: "" }),
    authorize() + "&state=other-state",
    "https://[invalid",
  ])("rejects unexpected authorization targets or weakened OAuth parameters", async (url) => {
    const queue = responses(json({ url }));
    await expect(startDiscordSignIn(callback, origin, async () => queue.shift()!)).rejects.toThrow(
      "temporarily unavailable",
    );
  });
  it("shows a bounded provider error while preserving the current approved draft return", async () => {
    const queue = responses(json({ url: origin + "/api/auth/error?error=OAuthCallback" }));
    await expect(startDiscordSignIn(callback, origin, async () => queue.shift()!)).rejects.toThrow(
      "Start again from this page",
    );
  });
  it("handles malformed responses, unavailable transport and timeout without leaking upstream data", async () => {
    const malformed = responses(new Response("Private upstream text", { status: 200 }));
    await expect(
      startDiscordSignIn(callback, origin, async () => malformed.shift()!),
    ).rejects.toThrow("temporarily unavailable");
    await expect(
      startDiscordSignIn(callback, origin, async () => {
        throw new Error("private transport");
      }),
    ).rejects.toThrow("could not be reached");
    const controller = new AbortController();
    controller.abort();
    await expect(
      startDiscordSignIn(
        callback,
        origin,
        async () => {
          throw new Error("private transport");
        },
        controller.signal,
      ),
    ).rejects.toThrow("took too long");
  });
});
describe("OAuth retry destinations and errors", () => {
  const invite = "/invitations/" + "a1".repeat(32);
  it("returns only to canonical team invitation confirmation, including configured-origin retries", () => {
    expect(safeSignInReturn(invite)).toBe(invite);
    expect(safeSignInReturn(origin + invite)).toBe("/settings");
    expect(safeSignInPageReturn(origin + invite, origin)).toBe(invite);
  });
  it.each([
    invite + "?role=ADMIN",
    invite + "?",
    invite + "#accept",
    invite + "/accept",
    "/invitations/" + "A1".repeat(32),
    "/invitations/" + "a".repeat(63),
    "/invitations/" + "a".repeat(65),
    "/invitations/%2f" + "a".repeat(62),
    "/invitations/%61" + "a".repeat(63),
    "/unused/../" + invite.slice(1),
    "/invitations/./" + "a1".repeat(32),
    "/invitations/%2e%2e/" + "a1".repeat(32),
    "//attacker.invalid" + invite,
  ])("rejects noncanonical or privilege-bearing invitation returns", (value) => {
    expect(safeSignInReturn(value)).toBe("/settings");
    expect(safeSignInPageReturn(origin + value, origin)).toBe("/settings");
  });
  it("rejects foreign-origin and normalized traversal invitation retry URLs", () => {
    expect(safeSignInPageReturn("https://attacker.invalid" + invite, origin)).toBe("/settings");
    expect(safeSignInPageReturn(origin + "/unused/../" + invite.slice(1), origin)).toBe(
      "/settings",
    );
    expect(safeSignInPageReturn(origin + "/unused/%2e%2e/" + invite.slice(1), origin)).toBe(
      "/settings",
    );
  });
  it("restores NextAuth absolute same-origin returns through the existing narrow relative allowlist", () => {
    expect(safeSignInPageReturn(origin + callback, origin)).toBe(callback);
    expect(safeSignInPageReturn(callback, origin)).toBe(callback);
    expect(safeSignInPageReturn(origin + "/settings", origin)).toBe("/settings");
  });
  it.each([
    "//attacker.invalid/compositions/new",
    "https://attacker.invalid/compositions/new",
    "https://albionoutpost.com.attacker.invalid/compositions/new",
    origin + "/groups",
    origin + "/compositions/new?callbackUrl=//attacker.invalid",
    origin + "/compositions/new?fromBuild=..%2Fprivate",
    origin + "/compositions/new#fragment",
    "https://user@albionoutpost.com/compositions/new",
    "https://albionoutpost.com\\@attacker.invalid/compositions/new",
    "%2f%2fattacker.invalid/compositions/new",
  ])("rejects unsafe retry URLs", (value) =>
    expect(safeSignInPageReturn(value, origin)).toBe("/settings"),
  );
  it("requires a configured trusted origin for absolute retries and never renders arbitrary provider text", () => {
    expect(safeSignInPageReturn(origin + callback, undefined)).toBe("/settings");
    expect(signInErrorMessage(undefined)).toBeNull();
    expect(signInErrorMessage("OAuthAccountNotLinked")).toContain("originally used");
    expect(signInErrorMessage("<script>secret</script>")).not.toContain("script");
    expect(signInErrorMessage(["OAuthCallback", "private text"])).not.toContain("private");
  });
});
