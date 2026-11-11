import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { addressLines } from "../src/lib/legal";

/** Runs scripts/cloudflare-release-config.mjs in a scratch copy and returns the web config. */
function releaseConfig() {
  const directory = mkdtempSync(join(tmpdir(), "outpost-release-config-test-"));
  try {
    mkdirSync(join(directory, "cloudflare/database"), { recursive: true });
    writeFileSync(join(directory, "wrangler.jsonc"), readFileSync("wrangler.jsonc"));
    writeFileSync(
      join(directory, "cloudflare/database/wrangler.jsonc"),
      readFileSync("cloudflare/database/wrangler.jsonc"),
    );
    const result = spawnSync(process.execPath, [resolve("scripts/cloudflare-release-config.mjs")], {
      cwd: directory,
      encoding: "utf8",
      env: {
        NODE_ENV: "test",
        CLOUDFLARE_CATALOG_DATABASE_ID: "11111111-1111-4111-8111-111111111111",
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: "0xFixturePublicKey",
      },
    });
    expect(result.status, result.stderr).toBe(0);
    return JSON.parse(readFileSync(join(directory, ".qa/cloudflare-release/web.jsonc"), "utf8"));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("release configuration: the published Impressum and the contact form", () => {
  const config = releaseConfig();

  it("sets the operator's public Impressum details as Worker vars", () => {
    expect(config.vars.OPERATOR_NAME).toBe("Hollow Lantern, Inhaber Rotenda Sino");
    expect(addressLines(config.vars.OPERATOR_ADDRESS)).toEqual([
      "c/o Impressumservice Dein-Impressum",
      "Stettiner Str. 41",
      "35410 Hungen",
      "Deutschland",
    ]);
    expect(config.vars.OPERATOR_EMAIL).toBe("contact@albionoutpost.com");
    expect(config.vars.OPERATOR_EDITOR).toBe("Rotenda Sino");
    // The tax registration is not done: no § 19 UStG line until the owner says so.
    expect(config.vars).not.toHaveProperty("OPERATOR_SMALL_BUSINESS");
  });

  it("binds the contact form's mail to the support mailbox only", () => {
    expect(config.send_email).toEqual([
      { name: "CONTACT_EMAIL", destination_address: "support@albionoutpost.com" },
    ]);
  });
});
