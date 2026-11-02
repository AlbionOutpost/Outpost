import { describe, it, expect } from "vitest";
import { readBoundedBody, readBoundedText } from "../src/lib/request-body";

function chunked(headers: Record<string, string> = {}) {
  let chunks = 0,
    cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (chunks === 10) return controller.close();
      chunks++;
      controller.enqueue(new Uint8Array(1024));
    },
    cancel() {
      cancelled = true;
    },
  });
  const request = new Request("https://outpost.test", {
    method: "POST",
    headers,
    body,
    duplex: "half",
  } as RequestInit);
  return { request, state: () => ({ chunks, cancelled }) };
}
describe("untrusted request body byte limit", () => {
  it("cancels an undeclared oversized stream before consuming its remaining chunks", async () => {
    const probe = chunked();
    await expect(readBoundedBody(probe.request, 2048)).rejects.toMatchObject({ status: 413 });
    expect(probe.state().cancelled).toBe(true);
    expect(probe.state().chunks).toBeLessThan(10);
  });
  it("rejects an oversized declared body without trusting smaller or missing lengths", async () => {
    const probe = chunked({ "content-length": "100000" });
    await expect(readBoundedBody(probe.request, 2048)).rejects.toMatchObject({ status: 413 });
    expect(probe.state().cancelled).toBe(true);
    const lying = chunked({ "content-length": "1" });
    await expect(readBoundedBody(lying.request, 2048)).rejects.toMatchObject({ status: 413 });
    expect(lying.state().cancelled).toBe(true);
  });
  it("counts UTF-8 bytes and preserves exact valid raw text for signatures", async () => {
    const body = '{"name":"café €"}\n';
    const bytes = new TextEncoder().encode(body).length;
    const request = () => new Request("https://outpost.test", { method: "POST", body });
    await expect(readBoundedText(request(), bytes)).resolves.toBe(body);
    await expect(readBoundedText(request(), bytes - 1)).rejects.toMatchObject({ status: 413 });
  });
});
