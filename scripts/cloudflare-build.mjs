import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const directory = resolve(".qa/cloudflare/build-config");
mkdirSync(directory, { recursive: true });
const child = spawn(process.execPath, ["node_modules/@opennextjs/cloudflare/dist/cli/index.js", "build", ...process.argv.slice(2)], {
  env: { ...process.env, XDG_CONFIG_HOME: directory, WRANGLER_SEND_METRICS: "false", WRANGLER_SEND_ERROR_REPORTS: "false", CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false", WRANGLER_LOG_PATH: resolve(".qa/cloudflare/build.log") },
  stdio: "inherit",
});
child.on("exit", (code) => { process.exitCode = code ?? 1; });
child.on("error", () => { console.error("The pinned OpenNext build could not start."); process.exitCode = 1; });
