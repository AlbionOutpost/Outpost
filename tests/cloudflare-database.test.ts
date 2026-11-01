import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  databaseFailure,
  models,
  sqliteArgs,
  validateQuery,
} from "../cloudflare/database/protocol";
import { HttpError } from "../src/lib/http-error";
import { paginateLibrary } from "../src/lib/grind-library-query";
import { longLiteralLike } from "../cloudflare/database/long-like.mjs";

describe("private Cloudflare database boundary", () => {
  it("covers the actual models without exposing arbitrary SQL or properties", () => {
    const actual = [...readFileSync("prisma/schema.prisma", "utf8").matchAll(/^model (\w+) \{/gm)]
      .map((m) => m[1][0].toLowerCase() + m[1].slice(1))
      .sort();
    expect([...models].sort()).toEqual(actual);
    for (const model of ["constructor", "__proto__", "$queryRaw", "user;DROP TABLE User"])
      expect(() => validateQuery({ model, operation: "findMany" })).toThrow(HttpError);
    expect(() => validateQuery({ model: "user", operation: "$executeRaw" })).toThrow();
  });
  it("denies public catalog mutations, including upserts and array writes", () => {
    for (const model of ["itemMetadata", "catalogRelease"])
      for (const operation of ["create", "createMany", "upsert", "updateMany", "deleteMany"])
        expect(() => validateQuery({ model, operation })).toThrow(
          "Catalog writes require a reviewed import",
        );
    expect(() =>
      validateQuery({
        model: "user",
        operation: "findMany",
        args: { where: { name: "x".repeat(2_000_001) } },
      }),
    ).toThrow("Database request too large");
  });
  it("adapts nested filters without modifying saved JSON, dates or array payloads", () => {
    const args = {
      where: { OR: [{ title: { contains: "AXE", mode: "insensitive" } }] },
      include: { builds: { where: { title: { mode: "insensitive", contains: "axe" } } } },
      data: {
        snapshot: { mode: "insensitive" },
        alternativeItemIds: ["T4_MAIN_AXE"],
        createdAt: new Date("2026-01-01"),
      },
    };
    const adapted = sqliteArgs(args)!;
    expect(adapted.where).toEqual({ OR: [{ title: { contains: "AXE" } }] });
    expect(adapted.include).toEqual({ builds: { where: { title: { contains: "axe" } } } });
    expect(adapted.data).toBe(args.data);
    expect(args.where.OR[0].title.mode).toBe("insensitive");
  });
  it("never returns unexpected database messages, arguments or stack traces", () => {
    expect(databaseFailure(new Error("secret SQL credentials and bound user data"))).toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
    expect(
      databaseFailure(
        Object.assign(new Error("private query"), { code: "P2002", meta: { private: "hidden" } }),
      ),
    ).toEqual({ ok: false, error: { kind: "prisma", code: "P2002" } });
    expect(databaseFailure(new HttpError(404, "Build not found"))).toEqual({
      ok: false,
      error: { kind: "http", status: 404, message: "Build not found" },
    });
  });
});

describe("public archive pagination", () => {
  const builds = JSON.parse(readFileSync("public/library/grind-builds.json", "utf8"));
  it("retains search, categories, archive order and bounded last-page selection", () => {
    const first = paginateLibrary(builds, { q: "axe", category: "MISTS_SOLO", page: 1 }, 24);
    const expected = builds.filter(
      (b: {
        category: string;
        title: string;
        weaponName: string;
        author: string;
        tags: string[];
      }) =>
        b.category === "MISTS_SOLO" &&
        `${b.title} ${b.weaponName} ${b.author} ${b.tags.join(" ")}`.toLowerCase().includes("axe"),
    );
    expect(first.total).toBe(10770);
    expect(first.matched).toBe(expected.length);
    expect(first.rows).toEqual(expected.slice(0, 24));
    const last = paginateLibrary(builds, { q: "axe", category: "MISTS_SOLO", page: 999999 }, 24);
    expect(last.page).toBe(last.pages);
    expect(last.rows).toEqual(expected.slice((last.page - 1) * 24));
  });
});

describe("Cloudflare SQLite long literal searches", () => {
  it("keeps values parameterized and maps the correct placeholder", () => {
    const text = "a".repeat(100);
    const sql =
      "SELECT `id` FROM `ItemMetadata` WHERE `active` = ? AND `main`.`ItemMetadata`.`name` LIKE ? AND `id` LIKE ? LIMIT ?";
    const result = longLiteralLike(sql, [true, `%${text}%`, "%AXE_%", 8]);
    expect(result.sql).toContain("instr(lower(`main`.`ItemMetadata`.`name`), lower(?)) > 0");
    expect(result.sql).not.toContain(text);
    expect(result.args).toEqual([true, text, "%AXE_%", 8]);
  });
  it("does not count question marks inside SQL strings or quoted identifiers", () => {
    const text = "é".repeat(40);
    const result = longLiteralLike("SELECT '?' AS `?` FROM `Build` WHERE `title` LIKE ?", [
      `%${text}%`,
    ]);
    expect(result.args).toEqual([text]);
    expect(result.sql).toContain("instr(lower(`title`)");
  });
  it("rejects long wildcards explicitly without modifying saved JSON", () => {
    expect(() => sqliteArgs({ where: { title: { contains: "a".repeat(99) + "%" } } })).toThrow(
      HttpError,
    );
    const data = { snapshot: { contains: "a".repeat(99) + "%" } };
    expect(sqliteArgs({ data })?.data).toBe(data);
  });
});
