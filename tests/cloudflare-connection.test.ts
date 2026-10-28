import { describe, expect, it, vi } from "vitest";
import { PassThrough } from "node:stream";
import {
  cloudflareRequest,
  cloudflareUrl,
  redactValues,
  pipeRedacted,
} from "../scripts/cloudflare-client.mjs";
import { scanText } from "../scripts/qa-source-secrets.mjs";

const credentials = {
  token: "fixture_" + "q".repeat(48),
  accountId: "a".repeat(32),
  zoneId: "b".repeat(32),
};
describe("persistent management authentication boundary", () => {
  it("redacts credentials across output chunks and large partial lines without corrupting UTF-8", async () => {
    const input = new PassThrough();
    let output = "";
    pipeRedacted(
      input,
      {
        write: (text: string) => {
          output += text;
        },
      },
      credentials.token,
    );
    const done = new Promise<void>((resolve) => input.on("end", resolve));
    const prefix = "x".repeat(65540);
    input.write(prefix + credentials.token.slice(0, 10));
    input.write(credentials.token.slice(10) + "\n");
    const ending = Buffer.from(`α ${credentials.token} café`);
    input.write(ending.subarray(0, 1));
    input.end(ending.subarray(1));
    await done;
    expect(output).toBe(prefix + "[redacted]\nα [redacted] café");
    expect(output).not.toContain(credentials.token);
  });
  it("keeps bearer credentials on the fixed official API origin without following redirects", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response(JSON.stringify({ success: true, result: { status: "active" } })),
    );
    const response = await cloudflareRequest("GET", "/zones?per_page=1", undefined, {
      credentials,
      fetch,
    });
    expect(response.result.status).toBe("active");
    expect(String(fetch.mock.calls[0][0])).toBe(
      "https://api.cloudflare.com/client/v4/zones?per_page=1",
    );
    expect(fetch.mock.calls[0][1]).toMatchObject({
      headers: { Authorization: `Bearer ${credentials.token}` },
      redirect: "error",
    });
  });
  it("rejects foreign origins, version escapes, fragments and unsupported methods before sending", async () => {
    for (const path of [
      "https://evil.example",
      "//evil.example",
      "/../../outside",
      "/zones#fragment",
    ])
      expect(() => cloudflareUrl(path)).toThrow();
    const fetch = vi.fn();
    await expect(
      cloudflareRequest("TRACE", "/zones", undefined, { credentials, fetch }),
    ).rejects.toThrow(/method/);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("reports upstream error codes without echoing reflected credentials or private response text", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () =>
        new Response(
          JSON.stringify({ success: false, errors: [{ code: 10000, message: credentials.token }] }),
          { status: 403 },
        ),
    );
    await expect(
      cloudflareRequest("GET", "/zones", undefined, { credentials, fetch }),
    ).rejects.toThrow("HTTP 403; codes: 10000");
    try {
      await cloudflareRequest("GET", "/zones", undefined, { credentials, fetch });
    } catch (error) {
      expect(String(error)).not.toContain(credentials.token);
    }
    const invalid = vi.fn<typeof globalThis.fetch>(
      async () => new Response(credentials.token, { status: 502 }),
    );
    await expect(
      cloudflareRequest("GET", "/zones", undefined, { credentials, fetch: invalid }),
    ).rejects.toThrow("non-JSON data (HTTP 502)");
  });
  it("bounds API response bodies", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response("x".repeat(8 * 1024 * 1024 + 1)),
    );
    await expect(
      cloudflareRequest("GET", "/zones", undefined, { credentials, fetch }),
    ).rejects.toThrow(/8MB/);
  });
  it("redacts configured values and detects all new Cloudflare credential prefixes", () => {
    expect(redactValues(`before ${credentials.token} after`, [credentials.token])).toBe(
      "before [redacted] after",
    );
    for (const prefix of ["cfat_", "cfut_", "cfk_"])
      expect(scanText(prefix + "z".repeat(48))).toContain("cloudflare-token");
    expect(scanText("CLOUDFLARE_API_TOKEN=placeholder")).toEqual([]);
  });
});

it("redacts several configured secrets when log chunks split their boundaries", async () => {
  const input = new PassThrough(),
    output: string[] = [];
  const first = "fixture-first-private-value",
    second = "fixture-second-private-value";
  pipeRedacted(input, { write: (value: string) => output.push(value) }, [first, second]);
  const ended = new Promise<void>((resolve) => input.on("end", resolve));
  input.write("value=" + first.slice(0, 11));
  input.write(first.slice(11) + "\nsecond=" + second.slice(0, 7));
  input.end(second.slice(7));
  await ended;
  expect(output.join("")).toBe("value=[redacted]\nsecond=[redacted]");
});
