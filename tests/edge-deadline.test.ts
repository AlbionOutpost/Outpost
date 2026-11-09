import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { boundedContext, withDeadline } from "../cloudflare/web/deadline";

// A pending timer keeps a Durable Object billable and holds work open in a Worker; every
// deadline must disappear the moment its work settles.
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const context = () => {
  const held: Promise<unknown>[] = [];
  return {
    held,
    ctx: { waitUntil: (p: Promise<unknown>) => held.push(p) },
  };
};

describe("render and background deadlines", () => {
  it("clears the render deadline once a streamed body has been read", async () => {
    const response = await withDeadline(Promise.resolve(new Response("page")));
    expect(vi.getTimerCount()).toBe(1);
    expect(await response.text()).toBe("page");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("clears it for a bodiless answer, a cancelled body and a failed render", async () => {
    await withDeadline(Promise.resolve(new Response(null, { status: 204 })));
    expect(vi.getTimerCount()).toBe(0);
    const streamed = await withDeadline(
      Promise.resolve(new Response(new ReadableStream({ pull() {} }))),
    );
    await streamed.body!.cancel();
    expect(vi.getTimerCount()).toBe(0);
    await expect(withDeadline(Promise.reject(new Error("render failed")))).rejects.toThrow();
    expect(vi.getTimerCount()).toBe(0);
    const broken = await withDeadline(
      Promise.resolve(
        new Response(
          new ReadableStream({
            pull(controller) {
              controller.error(new Error("stream failed"));
            },
          }),
        ),
      ),
    );
    await expect(broken.text()).rejects.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("answers 504 when nothing arrives within 30 seconds", async () => {
    const pending = withDeadline(new Promise<Response>(() => {}));
    await vi.advanceTimersByTimeAsync(30_000);
    const response = await pending;
    expect(response.status).toBe(504);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("bounds waitUntil work to ten seconds and drops the timer when it settles early", async () => {
    const { held, ctx } = context();
    const bounded = boundedContext(ctx);
    bounded.waitUntil(Promise.resolve("cached"));
    await Promise.all(held);
    expect(vi.getTimerCount()).toBe(0);
    bounded.waitUntil(Promise.reject(new Error("ignored")));
    await Promise.all(held);
    expect(vi.getTimerCount()).toBe(0);
    bounded.waitUntil(new Promise(() => {}));
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(10_000);
    await Promise.all(held);
    expect(vi.getTimerCount()).toBe(0);
  });
});
