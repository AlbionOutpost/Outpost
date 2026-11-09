import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { edgeTtl, saveMode } from "../cloudflare/web/save-mode";

describe("save mode", () => {
  it("is off unless the variable is exactly 1 or true", () => {
    expect(saveMode({})).toBe(false);
    expect(saveMode({ OUTPOST_SAVE_MODE: "0" })).toBe(false);
    expect(saveMode({ OUTPOST_SAVE_MODE: "yes" })).toBe(false);
    expect(saveMode({ OUTPOST_SAVE_MODE: "1" })).toBe(true);
    expect(saveMode({ OUTPOST_SAVE_MODE: "true" })).toBe(true);
  });
  it("keeps normal TTLs when off", () => {
    expect([30, 60, 120, 300].map((ttl) => edgeTtl(ttl, {}))).toEqual([30, 60, 120, 300]);
  });
  it("keeps answers ten times longer, at most an hour, when on", () => {
    const on = { OUTPOST_SAVE_MODE: "1" };
    expect([30, 60, 120, 300, 600, 7200].map((ttl) => edgeTtl(ttl, on))).toEqual([
      300, 600, 1200, 3000, 3600, 7200,
    ]);
  });
  it("is used for both edge-cache writes in the web Worker", () => {
    const worker = readFileSync(new URL("../cloudflare/web/worker.ts", import.meta.url), "utf8");
    expect(worker).toContain("pageToStore(copy, edgeTtl(page.ttl, env))");
    expect(worker).toContain("max-age=${edgeTtl(entry.ttl, env)}");
  });
});
