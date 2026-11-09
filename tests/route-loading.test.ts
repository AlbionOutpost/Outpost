import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const app = new URL("../src/app/", import.meta.url);
const hasPage = (dir: URL): boolean =>
  readdirSync(dir, { withFileTypes: true }).some((entry) =>
    entry.isDirectory() ? hasPage(new URL(`${entry.name}/`, dir)) : entry.name === "page.tsx",
  );

/* The landing renders with the first paint, so the root has no loading.tsx; every other
 * top-level route folder keeps the shared streaming skeleton (src/components/route-loading.tsx). */
describe("route loading boundaries", () => {
  it("leaves the landing without one", () => {
    expect(existsSync(new URL("loading.tsx", app))).toBe(false);
  });
  it("gives every other top-level route folder one", () => {
    const missing = readdirSync(app, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== "api")
      .filter((entry) => hasPage(new URL(`${entry.name}/`, app)))
      .filter((entry) => !existsSync(new URL(`${entry.name}/loading.tsx`, app)))
      .map((entry) => entry.name);
    expect(missing).toEqual([]);
  });
});
