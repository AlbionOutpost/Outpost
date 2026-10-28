import { describe, it, expect, vi } from "vitest";
import { verifyTurnstile } from "../src/lib/turnstile";

const config = {
  sitekey: "fixture-public-key",
  secret: "fixture-secret-value",
  hostnames: "albionoutpost.com,www.albionoutpost.com",
  production: true,
};
const answer = (value: unknown, status = 200) =>
  vi.fn<typeof fetch>(async () => new Response(JSON.stringify(value), { status }));
describe("Turnstile server boundary", () => {
  it("rejects redirect responses without forwarding the secret", async () => {
    const send = vi.fn<typeof fetch>(
      async () =>
        new Response(null, {
          status: 302,
          headers: { Location: "https://untrusted.example/collect" },
        }),
    );
    await expect(
      verifyTurnstile("fixture-token", "community_write", config, send),
    ).rejects.toMatchObject({ status: 503 });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][1]?.redirect).toBe("manual");
  });
  it("allows only provider-confirmed success, exact hostname and expected action", async () => {
    const send = answer({
      success: true,
      hostname: "albionoutpost.com",
      action: "community_write",
    });
    await expect(
      verifyTurnstile("fixture-token", "community_write", config, send),
    ).resolves.toBeUndefined();
    expect(String(send.mock.calls[0][0])).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    );
    expect(send.mock.calls[0][1]).toMatchObject({
      method: "POST",
      redirect: "manual",
      cache: "no-store",
    });
    const form = send.mock.calls[0][1]!.body as URLSearchParams;
    expect(form.get("secret")).toBe(config.secret);
    expect(form.get("response")).toBe("fixture-token");
    expect(form.has("remoteip")).toBe(false);
  });
  it("rejects forged success, expired/replayed tokens, other actions and lookalike hosts", async () => {
    for (const result of [
      { success: false, "error-codes": ["timeout-or-duplicate"] },
      { success: "true", hostname: "albionoutpost.com", action: "community_write" },
      { success: true, hostname: "albionoutpost.com.evil.example", action: "community_write" },
      { success: true, hostname: "localhost", action: "community_write" },
      { success: true, hostname: "albionoutpost.com", action: "login" },
      { success: true },
    ])
      await expect(
        verifyTurnstile("fixture-token", "community_write", config, answer(result)),
      ).rejects.toMatchObject({ status: 403 });
  });
  it("rejects missing/oversized tokens before a provider request", async () => {
    const send = answer({ success: true });
    for (const token of [null, "", " ", "x".repeat(2049)])
      await expect(verifyTurnstile(token, "community_write", config, send)).rejects.toMatchObject({
        status: 403,
      });
    expect(send).not.toHaveBeenCalled();
  });
  it("fails closed for partial configuration and localhost production allowlists", async () => {
    const send = answer({ success: true });
    for (const invalid of [
      { ...config, secret: undefined },
      { ...config, sitekey: undefined },
      { ...config, hostnames: "" },
      { ...config, hostnames: "albionoutpost.com,localhost" },
      { ...config, hostnames: "*.albionoutpost.com" },
    ])
      await expect(
        verifyTurnstile("fixture-token", "community_write", invalid, send),
      ).rejects.toMatchObject({ status: 503 });
    expect(send).not.toHaveBeenCalled();
  });
  it("keeps all-unconfigured local/staging behavior explicit", async () => {
    const send = answer({ success: true });
    await verifyTurnstile(null, "community_write", { production: false }, send);
    expect(send).not.toHaveBeenCalled();
    await expect(
      verifyTurnstile(null, "community_write", { production: true, required: true }, send),
    ).rejects.toMatchObject({ status: 503 });
  });
  it("bounds provider output and hides network or reflected-secret failures", async () => {
    for (const send of [
      answer({}, 500),
      answer(null),
      answer("x".repeat(16385)),
      vi.fn<typeof fetch>(async () => {
        throw Error(config.secret);
      }),
    ]) {
      try {
        await verifyTurnstile("fixture-token", "community_write", config, send);
        throw Error("Expected rejection");
      } catch (error) {
        expect(error).toMatchObject({ status: 503 });
        expect(String(error)).not.toContain(config.secret);
      }
    }
  });
});
