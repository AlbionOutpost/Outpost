import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

const directory = resolve(".qa/cloudflare/build-config");
mkdirSync(directory, { recursive: true });
const args = process.argv.slice(2),
  production = args.includes("--production");
let sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
if (production && !sitekey)
  sitekey = parseEnv(
    readFileSync(".env.cloudflare-runtime", "utf8"),
  ).NEXT_PUBLIC_TURNSTILE_SITE_KEY;
if (production && !/^0x[A-Za-z0-9_-]+$/.test(sitekey ?? ""))
  throw new Error("Production challenge site key missing");
const child = spawn(
  process.execPath,
  [
    "node_modules/@opennextjs/cloudflare/dist/cli/index.js",
    "build",
    ...args.filter((arg) => arg !== "--production"),
  ],
  {
    env: {
      ...process.env,
      OUTPOST_RUNTIME: "cloudflare",
      ...(sitekey ? { NEXT_PUBLIC_TURNSTILE_SITE_KEY: sitekey } : {}),
      XDG_CONFIG_HOME: directory,
      WRANGLER_SEND_METRICS: "false",
      WRANGLER_SEND_ERROR_REPORTS: "false",
      CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
      WRANGLER_LOG_PATH: resolve(".qa/cloudflare/build.log"),
    },
    stdio: "inherit",
  },
);
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
  if (code === 0) {
    const result = spawnSync(process.execPath, ["scripts/cloudflare-public-assets.mjs"], {
      stdio: "inherit",
      env: process.env,
    });
    process.exitCode = result.status ?? 1;
  }
});
child.on("error", () => {
  console.error("The pinned OpenNext build could not start.");
  process.exitCode = 1;
});
