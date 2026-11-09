import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  checkTarget,
  CONFIRMATION,
  helperConfig,
  helperSource,
  ownerConfirms,
  parseArgs,
} from "../scripts/cloudflare-recovery.mjs";

/* The restore runbook (docs/OPERATIONS.md § Backups and recovery). The live path needs the
 * owner's Cloudflare credentials and Cloudflare's PITR API, which does not run locally; these
 * tests cover everything around it: argument checks, the owner gate and the helper Worker. */

const NOW = Date.parse("2026-11-09T12:00:00Z");
const BOOKMARK = "0000007b-0000b26e-00001538-0c3e87bb37b3db5cc52eedb93cd3b96b";

describe("arguments", () => {
  it("accepts the documented forms", () => {
    expect(parseArgs(["bookmark"], NOW)).toMatchObject({ action: "bookmark", apply: false });
    expect(parseArgs(["restore", "--at", "2026-11-02T18:00:00Z"], NOW)).toMatchObject({
      action: "restore",
      time: Date.parse("2026-11-02T18:00:00Z"),
      apply: false,
    });
    expect(parseArgs(["restore", "--bookmark", BOOKMARK, "--apply"], NOW)).toMatchObject({
      bookmark: BOOKMARK,
      apply: true,
    });
  });

  it("refuses times outside Cloudflare's 30 days, bad bookmarks and ambiguous restores", () => {
    expect(() => parseArgs(["restore", "--at", "2026-10-09T11:00:00Z"], NOW)).toThrow(/30 days/);
    expect(() => parseArgs(["restore", "--at", "2026-11-10T00:00:00Z"], NOW)).toThrow(/30 days/);
    expect(() => parseArgs(["restore", "--at", "yesterday"], NOW)).toThrow(/valid time/);
    expect(() => parseArgs(["restore", "--bookmark", "'; drop"], NOW)).toThrow(/bookmark/);
    expect(() => parseArgs(["restore"], NOW)).toThrow(/exactly one/);
    expect(() =>
      parseArgs(["restore", "--at", "2026-11-02T18:00:00Z", "--bookmark", BOOKMARK], NOW),
    ).toThrow(/exactly one/);
    expect(() => parseArgs(["bookmark", "--apply"], NOW)).toThrow(/only goes with restore/);
    expect(() => parseArgs(["delete"], NOW)).toThrow(/Usage/);
  });

  it("refuses a target that is malformed or the current state", () => {
    expect(() => checkTarget(BOOKMARK, BOOKMARK)).toThrow(/current state/);
    expect(() => checkTarget(undefined, BOOKMARK)).toThrow(/invalid/);
    expect(() => checkTarget(BOOKMARK.replace("7b", "7a"), BOOKMARK)).not.toThrow();
  });
});

describe("owner gate for --apply", () => {
  const tty = { isTTY: true };
  it("needs an interactive terminal outside CI and the exact phrase", async () => {
    const ask = vi.fn(async () => `  ${CONFIRMATION}\n`);
    await expect(ownerConfirms({ env: {}, stdin: tty, ask })).resolves.toBeUndefined();
    expect(CONFIRMATION).toBe("restore accounts-v1-eu");
  });
  it("refuses CI, piped input and a wrong answer without asking twice", async () => {
    const ask = vi.fn(async () => CONFIRMATION);
    await expect(ownerConfirms({ env: { CI: "true" }, stdin: tty, ask })).rejects.toThrow(/CI/);
    await expect(
      ownerConfirms({ env: { GITHUB_ACTIONS: "true" }, stdin: tty, ask }),
    ).rejects.toThrow(/CI/);
    await expect(ownerConfirms({ env: {}, stdin: { isTTY: false }, ask })).rejects.toThrow(
      /interactive terminal/,
    );
    expect(ask).not.toHaveBeenCalled();
    await expect(ownerConfirms({ env: {}, stdin: tty, ask: async () => "yes" })).rejects.toThrow(
      /Not confirmed/,
    );
  });
});

describe("helper Worker", () => {
  type Helper = { fetch(request: Request, env: unknown): Promise<Response> };
  let helper: Helper;
  const calls: unknown[][] = [];
  const db = {
    recoveryBookmark: async (time?: number) => (calls.push(["bookmark", time]), BOOKMARK),
    recoveryRestore: async (bookmark: string) => (calls.push(["restore", bookmark]), "undo"),
    recoveryRestart: async () => {
      calls.push(["restart"]);
      throw new Error("aborted");
    },
    health: async () => true,
  };
  const env = {
    RECOVERY_TOKEN: "f".repeat(64),
    DATABASE: { getByName: (name: string) => (calls.push(["object", name]), db) },
  };
  const post = (body: unknown, token?: string, target = env) =>
    helper.fetch(
      new Request("https://helper.example/", {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body: JSON.stringify(body),
      }),
      target,
    );
  beforeAll(async () => {
    // workerd's constant-time compare, which Node lacks.
    Object.defineProperty(crypto.subtle, "timingSafeEqual", {
      configurable: true,
      value: (a: Uint8Array, b: Uint8Array) => a.every((byte, i) => byte === b[i]),
    });
    helper = (
      await import(`data:text/javascript;base64,${Buffer.from(helperSource).toString("base64")}`)
    ).default;
  });
  afterAll(() => {
    Reflect.deleteProperty(crypto.subtle, "timingSafeEqual");
  });

  it("answers nothing without the run's token, and touches no object", async () => {
    calls.length = 0;
    for (const token of [undefined, "", "f".repeat(63), "e".repeat(64), `${"f".repeat(64)}x`])
      expect((await post({ action: "restore", bookmark: BOOKMARK }, token)).status).toBe(404);
    expect(
      (await post({ action: "bookmark" }, "undefined", { ...env, RECOVERY_TOKEN: "" })).status,
    ).toBe(404);
    expect(calls).toEqual([]);
  });

  it("runs the four actions on the private object only", async () => {
    calls.length = 0;
    const token = env.RECOVERY_TOKEN;
    expect(await (await post({ action: "bookmark", time: NOW }, token)).json()).toEqual({
      bookmark: BOOKMARK,
    });
    expect(await (await post({ action: "restore", bookmark: BOOKMARK }, token)).json()).toEqual({
      undo: "undo",
    });
    expect(await (await post({ action: "restart" }, token)).json()).toEqual({ restarted: true });
    expect(await (await post({ action: "health" }, token)).json()).toEqual({ ok: true });
    expect((await post({ action: "query" }, token)).status).toBe(400);
    expect(
      calls.filter(([kind]) => kind === "object").every(([, name]) => name === "accounts-v1-eu"),
    ).toBe(true);
    expect(calls.filter(([kind]) => kind !== "object")).toEqual([
      ["bookmark", NOW],
      ["restore", BOOKMARK],
      ["restart"],
    ]);
  });

  it("binds only the data Worker's private database class", () => {
    expect(helperConfig.durable_objects.bindings).toEqual([
      { name: "DATABASE", class_name: "OutpostDatabase", script_name: "albionoutpost-data" },
    ]);
    expect(JSON.stringify(helperConfig)).not.toContain("RECOVERY_TOKEN");
  });
});

describe("recovery hooks stay off the public paths", () => {
  const source = readFileSync(new URL("../cloudflare/database/worker.ts", import.meta.url), "utf8");
  it("are methods of the Durable Object, not of the data Worker's RPC entrypoint", () => {
    const entrypoint = source.slice(source.indexOf("export default class OutpostData"));
    expect(entrypoint).not.toMatch(/recovery/i);
    expect(source).toMatch(/async recoveryRestore\(bookmark: string\)/);
  });
  it("are unreachable from the web Worker, which binds no OutpostDatabase", () => {
    const web = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
    expect(web).not.toContain("OutpostDatabase");
  });
});
