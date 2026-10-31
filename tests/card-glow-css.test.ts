import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The production minifier rewrote `initial-value: 0%` to `0`, which made the registered
// property invalid; every card background that read var(--glow) was then dropped and the
// framed cards turned see-through. Keep the property unit-free and every use defaulted.
describe("card glow property", () => {
  const css = readFileSync("src/app/product-system.css", "utf8");
  it("registers --glow as a plain number", () => {
    expect(css).toMatch(/@property --glow \{[^}]*syntax: "<number>";[^}]*initial-value: 0;/);
  });
  it("never reads --glow without a fallback", () => {
    expect(css.match(/var\(--glow\)/g)).toBeNull();
  });
});
