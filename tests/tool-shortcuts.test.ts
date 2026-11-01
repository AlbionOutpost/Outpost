import { describe, expect, it } from "vitest";
import { parseToolShortcuts } from "../src/lib/tool-shortcuts";
const paths = [
  "/tools/market",
  "/tools/crafting",
  "/builds/new",
  "/tools/fishing",
  "/tools/refining",
  "/tools/flipping",
  "/tools/farming",
];
describe("device tool shortcuts", () => {
  it("rejects malformed and foreign destinations while retaining known paths", () => {
    expect(parseToolShortcuts("{bad", paths)).toEqual([]);
    expect(parseToolShortcuts('{"path":"/tools/market"}', paths)).toEqual([]);
    expect(
      parseToolShortcuts(
        JSON.stringify([
          "https://elsewhere.example",
          "//elsewhere.example",
          "/admin/reports",
          12,
          null,
          "/tools/market",
        ]),
        paths,
      ),
    ).toEqual(["/tools/market"]);
  });
  it("deduplicates and bounds the collection without changing accepted order", () => {
    expect(parseToolShortcuts(JSON.stringify([paths[2], paths[2], ...paths]), paths)).toEqual([
      paths[2],
      paths[0],
      paths[1],
      paths[3],
      paths[4],
      paths[5],
    ]);
  });
});
