import { lstatSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { loadCloudflareCredentials, redactValues } from "./cloudflare-client.mjs";
const path = ".env.cloudflare-runtime",
  stat = lstatSync(path);
if (!stat.isFile() || stat.isSymbolicLink() || stat.mode & 0o077)
  throw new Error("Runtime credentials must remain owner-only");
const values = parseEnv(readFileSync(path, "utf8"));
const names = [
  "NEXTAUTH_SECRET",
  "DISCORD_CLIENT_SECRET",
  "TURNSTILE_SECRET",
  "OUTPOST_RENDER_SESSION_SECRET",
];
if (names.some((name) => !values[name])) throw new Error("Genuine runtime secrets missing");
if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify({ ready: true, secretNames: names, uploaded: false }));
  process.exit(0);
}
const { token, accountId } = loadCloudflareCredentials();
const secrets = Object.fromEntries(names.map((name) => [name, values[name]]));
const result = spawnSync(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "secret",
    "bulk",
    "--config",
    resolve(".qa/cloudflare-release/web.jsonc"),
  ],
  {
    input: JSON.stringify(secrets),
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: token,
      CLOUDFLARE_ACCOUNT_ID: accountId,
      XDG_CONFIG_HOME: resolve(".qa/cloudflare-release/config"),
      WRANGLER_SEND_METRICS: "false",
      WRANGLER_SEND_ERROR_REPORTS: "false",
      CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
    },
  },
);
mkdirSync(".qa/cloudflare-release", { recursive: true });
writeFileSync(
  ".qa/cloudflare-release/runtime-upload.log",
  redactValues((result.stdout ?? "") + (result.stderr ?? ""), [token, ...Object.values(secrets)]),
);
if (result.status !== 0)
  throw new Error("Runtime secret upload failed; see the sanitized local log");
console.log(
  JSON.stringify({
    uploaded: true,
    worker: "albionoutpost-web",
    secretNames: names,
    administrativeCredentialsUploaded: false,
  }),
);
