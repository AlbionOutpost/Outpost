import { describe, expect, it, vi } from "vitest";
import { createJsonCache, JsonRequestError, withSignal } from "../src/lib/client-json-cache";

const answer = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function setup(ttlMs = 1000, max = 64) {
  let clock = 0;
  const calls: string[] = [];
  const pending: ((response: Response) => void)[] = [];
  const cache = createJsonCache({
    ttlMs,
    max,
    now: () => clock,
    fetcher: (url) => {
      calls.push(url);
      return new Promise<Response>((resolve) => pending.push(resolve));
    },
  });
  return {
    cache,
    calls,
    respond: (body: unknown, status = 200) => pending.shift()!(answer(body, status)),
    advance: (ms: number) => (clock += ms),
  };
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("browser JSON cache for public market answers", () => {
  it("shares one request between callers asking for the same answer at once", async () => {
    const { cache, calls, respond } = setup();
    const first = cache.get("/api/market?item=A");
    const second = cache.get("/api/market?item=A");
    expect(calls).toEqual(["/api/market?item=A"]);
    respond({ prices: [1] });
    await expect(first).resolves.toEqual({ prices: [1] });
    await expect(second).resolves.toEqual({ prices: [1] });
  });
  it("reuses a settled answer until it expires, then asks again", async () => {
    const { cache, calls, respond, advance } = setup(1000);
    expect(cache.peek("/a")).toBeUndefined();
    const first = cache.get("/a");
    expect(cache.peek("/a")).toBeUndefined(); // in flight is not an answer yet
    respond({ n: 1 });
    await first;
    await settle();
    expect(cache.peek("/a")).toEqual({ n: 1 });
    await expect(cache.get("/a")).resolves.toEqual({ n: 1 });
    expect(calls).toHaveLength(1);
    advance(1000);
    expect(cache.peek("/a")).toBeUndefined();
    const again = cache.get("/a");
    expect(calls).toHaveLength(2);
    respond({ n: 2 });
    await expect(again).resolves.toEqual({ n: 2 });
  });
  it("keeps answers apart by URL", async () => {
    const { cache, calls, respond } = setup();
    const a = cache.get("/api/market?item=T4_BAG");
    const b = cache.get("/api/market?item=T4_BAG%401");
    expect(calls).toHaveLength(2);
    respond({ item: "T4_BAG" });
    respond({ item: "T4_BAG@1" });
    await expect(a).resolves.toEqual({ item: "T4_BAG" });
    await expect(b).resolves.toEqual({ item: "T4_BAG@1" });
  });
  it("never keeps a failure and reports the server's message", async () => {
    const { cache, calls, respond } = setup();
    const failed = cache.get("/a");
    respond({ error: "Market data is unavailable." }, 503);
    await expect(failed).rejects.toEqual(new JsonRequestError("Market data is unavailable.", 503));
    await settle();
    expect(cache.peek("/a")).toBeUndefined();
    const retry = cache.get("/a");
    expect(calls).toHaveLength(2);
    respond({ ok: true });
    await expect(retry).resolves.toEqual({ ok: true });
  });
  it("asks anew for a fresh read, and the newer answer replaces the kept one", async () => {
    const { cache, calls, respond } = setup();
    const first = cache.get("/a");
    respond({ n: 1 });
    await first;
    await settle();
    const refreshed = cache.get("/a", { fresh: true });
    // A second fresh read while one is in flight joins it instead of starting a third.
    const joined = cache.get("/a", { fresh: true });
    expect(calls).toHaveLength(2);
    respond({ n: 2 });
    await expect(refreshed).resolves.toEqual({ n: 2 });
    await expect(joined).resolves.toEqual({ n: 2 });
    await settle();
    expect(cache.peek("/a")).toEqual({ n: 2 });
  });
  it("drops the oldest settled answers past its size bound", async () => {
    const { cache, respond } = setup(1000, 2);
    for (const url of ["/1", "/2", "/3"]) {
      const request = cache.get(url);
      respond({ url });
      await request;
      await settle();
    }
    expect(cache.peek("/1")).toBeUndefined();
    expect(cache.peek("/2")).toEqual({ url: "/2" });
    expect(cache.peek("/3")).toEqual({ url: "/3" });
  });
  it("lets a caller stop waiting without cancelling the shared request", async () => {
    const { cache, respond } = setup();
    const controller = new AbortController();
    const waiting = withSignal(cache.get("/a"), controller.signal);
    controller.abort();
    await expect(waiting).rejects.toBeDefined();
    respond({ n: 1 });
    await expect(cache.get("/a")).resolves.toEqual({ n: 1 });
    const done = vi.fn();
    await withSignal(Promise.resolve(1), new AbortController().signal).then(done);
    expect(done).toHaveBeenCalledWith(1);
  });
});
