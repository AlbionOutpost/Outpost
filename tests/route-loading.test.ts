import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const app = new URL("../src/app/", import.meta.url);
const hasPage = (dir: URL): boolean =>
  readdirSync(dir, { withFileTypes: true }).some((entry) =>
    entry.isDirectory() ? hasPage(new URL(`${entry.name}/`, dir)) : entry.name === "page.tsx",
  );
const loadingFiles = (dir: URL, prefix = ""): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? loadingFiles(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`)
      : entry.name === "loading.tsx"
        ? [`${prefix}loading.tsx`]
        : [],
  );

/* Content pages send their text in the first HTML (crawlers, ad review and the first paint read
 * it), so they have no streamed loading boundary: the landing, guides, tools and calculators, the
 * build and comp libraries, items and the market data help. Only their editors keep the shared
 * skeleton. Every other top-level route folder (personal or live pages) keeps
 * src/components/route-loading.tsx. */
const content = ["builds", "compositions", "guides", "items", "market-data", "tools"];
const editors = [
  "builds/[id]/edit/loading.tsx",
  "builds/new/loading.tsx",
  "compositions/[id]/edit/loading.tsx",
  "compositions/new/loading.tsx",
];

describe("route loading boundaries", () => {
  it("leaves the landing without one", () => {
    expect(existsSync(new URL("loading.tsx", app))).toBe(false);
  });
  it("leaves content pages without one, except their editors", () => {
    const found = content.flatMap((dir) => loadingFiles(new URL(`${dir}/`, app), `${dir}/`));
    expect(found.sort()).toEqual([...editors].sort());
  });
  it("gives every other top-level route folder one", () => {
    const missing = readdirSync(app, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== "api")
      .filter((entry) => !content.includes(entry.name))
      .filter((entry) => hasPage(new URL(`${entry.name}/`, app)))
      .filter((entry) => !existsSync(new URL(`${entry.name}/loading.tsx`, app)))
      .map((entry) => entry.name);
    expect(missing).toEqual([]);
  });
});
