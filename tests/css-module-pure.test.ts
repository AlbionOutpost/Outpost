import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The production (webpack) build rejects CSS-module selectors without a local class or id; the
// dev server accepts them, so this keeps the mistake from first surfacing in CI.
const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? files(join(dir, e.name))
      : e.name.endsWith(".module.css")
        ? [join(dir, e.name)]
        : [],
  );

// Split on commas outside brackets, and drop :global(...) with any nesting inside it.
const topLevel = (list: string) => {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === "," && depth === 0) {
      parts.push(list.slice(start, i));
      start = i + 1;
    }
  }
  return [...parts, list.slice(start)];
};
const withoutGlobal = (selector: string) => {
  let out = "";
  for (let i = 0; i < selector.length; i++) {
    if (selector.startsWith(":global(", i)) {
      let depth = 0;
      for (i += ":global".length; i < selector.length; i++) {
        if (selector[i] === "(") depth++;
        else if (selector[i] === ")" && --depth === 0) break;
      }
      continue;
    }
    out += selector[i];
  }
  return out.replace(/\[[^\]]*\]/g, "");
};

const impure = (css: string) => {
  const out: string[] = [];
  const body = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [, prelude] of body.matchAll(/([^{};]+)\{/g)) {
    const head = prelude.trim();
    if (!head || head.startsWith("@") || /^(from|to|\d+%)/.test(head)) continue;
    for (const selector of topLevel(head))
      if (!/[.#][A-Za-z_-]/.test(withoutGlobal(selector))) out.push(selector.trim());
  }
  return out;
};

describe("CSS modules", () => {
  it("give every selector a local class or id", () => {
    const found = files("src").flatMap((f) =>
      impure(readFileSync(f, "utf8")).map((s) => `${f}: ${s}`),
    );
    expect(found).toEqual([]);
  });

  it("flags the selector the webpack build rejected", () => {
    expect(
      impure(':global(.app.outpost) [data-state="done"] > button { color: red }'),
    ).toHaveLength(1);
    expect(
      impure(':global(.app.outpost) .progress [data-state="done"] > button { color: red }'),
    ).toEqual([]);
  });
});
