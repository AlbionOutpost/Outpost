import { describe, expect, it, vi } from "vitest";
import { Issuer } from "openid-client";

describe("Discord sign-in", () => {
  it("names Discord's issuer so callbacks carrying iss are accepted", async () => {
    vi.stubEnv("DISCORD_CLIENT_ID", "client");
    vi.stubEnv("DISCORD_CLIENT_SECRET", "secret");
    const { authOptions } = await import("@/lib/auth");
    const provider = authOptions.providers[0] as unknown as { options: { issuer?: string } };
    expect(provider.options.issuer).toBe("https://discord.com");
    // openid-client checks iss before exchanging the code: with the issuer named the callback
    // gets past that check (and stops at the token endpoint this fixture leaves out).
    const callback = (issuer?: string) =>
      new new Issuer({ issuer } as never).Client({ client_id: "c" })
        .oauthCallback(
          "https://x/cb",
          { code: "a", state: "s", iss: "https://discord.com" },
          { state: "s" },
        )
        .catch((error: Error) => error.message);
    expect(await callback()).toMatch(/issuer must be configured/);
    expect(await callback(provider.options.issuer)).toMatch(/token_endpoint/);
    vi.unstubAllEnvs();
  });
});
