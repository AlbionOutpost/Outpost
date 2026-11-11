import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { toolExplainers } from "../src/lib/tool-explainers";

const guides = new Set(
  (JSON.parse(readFileSync("public/library/grind-guides.json", "utf8")) as { slug: string }[]).map(
    (guide) => guide.slug,
  ),
);
const calculators = [
  "crafting",
  "refining",
  "cooking",
  "alchemy",
  "enchanting",
  "farming",
  "fishing",
  "flipping",
  "black-market",
  "profitable-crafts",
  "transporting",
  "laborers",
  "mastery",
];

describe("calculator How it works blocks", () => {
  it.each(calculators)("/tools/%s renders its block on the server", (name) => {
    const path = `/tools/${name}`;
    const page = readFileSync(`src/app/tools/${name}/page.tsx`, "utf8");
    expect(page).not.toMatch(/^["']use client["']/);
    expect(page).toContain(`<HowItWorks path="${path}" />`);
    const explainer = toolExplainers[path];
    expect(explainer.computes.length).toBeGreaterThan(40);
    expect(explainer.inputs.length).toBeGreaterThan(40);
    expect(explainer.math.length).toBeGreaterThanOrEqual(1);
    expect(explainer.math.length).toBeLessThanOrEqual(3);
  });
  it("covers exactly the calculators", () => {
    expect(Object.keys(toolExplainers).sort()).toEqual(
      calculators.map((n) => `/tools/${n}`).sort(),
    );
  });
  it.each(Object.entries(toolExplainers).filter(([, e]) => e.guide))(
    "%s links a guide that exists",
    (_, explainer) => expect(guides.has(explainer.guide!.slug)).toBe(true),
  );
  it("states the return-rate constants the engine uses", async () => {
    const bonuses = (await import("../src/lib/albion/game/production-bonuses.json")).default
      .efficiency;
    const crafting = toolExplainers["/tools/crafting"].math.join(" ");
    expect(crafting).toContain(`bonus of ${bonuses.base}`);
    expect(crafting).toContain(`adds ${bonuses.crafting}`);
    expect(crafting).toContain(`focus adds ${bonuses.focus}`);
    expect(crafting).toContain(`${bonuses.daily[1]} or ${bonuses.daily[2]}`);
    expect(toolExplainers["/tools/refining"].math.join(" ")).toContain(`adds ${bonuses.refining}`);
    // 18 ÷ 118 and the refining city's 58 ÷ 158 and 117 ÷ 217, as rounded in the copy.
    expect(((100 * 18) / 118).toFixed(1)).toBe("15.3");
    expect(((100 * 58) / 158).toFixed(1)).toBe("36.7");
    expect(((100 * 117) / 217).toFixed(1)).toBe("53.9");
  });
});
