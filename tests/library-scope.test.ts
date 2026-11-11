import { describe, expect, it } from "vitest";
import { indexedBuild, indexedComposition, testLikeTitle } from "../src/lib/library-scope";

const comp = {
  title: "7-man Unstoppable Dive",
  description: "Dive the enemy backline. If versus Kite/Clap wait for them to hit first.",
  upvotes: 1,
  members: ["a", "b", "c", "d", "e", "f", "g"],
};

describe("test-like titles", () => {
  it.each(["testedeclap", "Test moria 2", "test ss", "TestingB", "Imperial Decree Static Test"])(
    "flags %s",
    (title) => expect(testLikeTitle(title)).toBe(true),
  );
  it.each(["Contest brawl", "Attestation", "7 Man Roads FTB", "", undefined])("keeps %s", (title) =>
    expect(testLikeTitle(title)).toBe(false),
  );
});

describe("indexed library builds", () => {
  it("needs a like and a real title", () => {
    expect(indexedBuild({ upvotes: 1, title: "Wailing Bow (DreamTeam)" })).toBe(true);
    expect(indexedBuild({ upvotes: 1 })).toBe(true);
    expect(indexedBuild({ upvotes: 0, title: "Wailing Bow" })).toBe(false);
    expect(indexedBuild({ title: "Wailing Bow" })).toBe(false);
    expect(indexedBuild({ upvotes: 3, title: "test ss" })).toBe(false);
  });
});

describe("indexed library comps", () => {
  it("lists a liked comp with a real description and title", () => {
    expect(indexedComposition(comp)).toBe(true);
  });
  it("needs at least one like", () => {
    expect(indexedComposition({ ...comp, upvotes: 0 })).toBe(false);
    expect(indexedComposition({ ...comp, upvotes: undefined })).toBe(false);
  });
  it("needs a description of at least 40 characters and 6 words", () => {
    expect(indexedComposition({ ...comp, description: "" })).toBe(false);
    // 6 words but 39 characters.
    expect(
      indexedComposition({ ...comp, description: "Tank heal dps dps dps support xxxxxxxxx" }),
    ).toBe(false);
    // 42 characters but 5 words.
    expect(
      indexedComposition({ ...comp, description: "Fullpressfight sevenversusseven roads ok go" }),
    ).toBe(false);
    // Markdown markers and runs of spaces do not count toward the length.
    expect(
      indexedComposition({ ...comp, description: "## ** Tank   heal   dps   dps **  ##" }),
    ).toBe(false);
    expect(
      indexedComposition({ ...comp, description: "Comp for group dungeons. Fine up to 8.4 tier." }),
    ).toBe(true);
  });
  it("rejects test copies and titles without three letters", () => {
    expect(indexedComposition({ ...comp, title: "testedeclap" })).toBe(false);
    expect(indexedComposition({ ...comp, title: "Test moria 2" })).toBe(false);
    expect(indexedComposition({ ...comp, title: "ff" })).toBe(false);
    expect(indexedComposition({ ...comp, title: "7v7" })).toBe(false);
    expect(indexedComposition({ ...comp, title: "zvz" })).toBe(true);
  });
  it("needs at least two members", () => {
    expect(indexedComposition({ ...comp, members: ["a"] })).toBe(false);
    expect(indexedComposition({ ...comp, members: undefined })).toBe(false);
  });
});
