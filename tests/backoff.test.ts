import { describe, it, expect } from "vitest";
import { retryDelay } from "../src/lib/albion/backoff";
describe("upstream retry policy", () => {
  it("honors retry-after seconds", () =>
    expect(retryDelay(new Headers({ "retry-after": "42" }))).toBe(42000));
  it("honors an HTTP date", () =>
    expect(
      retryDelay(
        new Headers({ "retry-after": "Sun, 25 Oct 2026 20:00:00 GMT" }),
        Date.parse("2026-10-25T19:59:00Z"),
      ),
    ).toBe(60000));
  it("honors epoch reset headers", () =>
    expect(retryDelay(new Headers({ "x-ratelimit-reset": "1792958400" }), 1792958390000)).toBe(
      10000,
    ));
  it("backs off conservatively without headers", () =>
    expect(retryDelay(new Headers())).toBe(60000));
});
