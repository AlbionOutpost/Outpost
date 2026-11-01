import { mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { cloudflareStatus, loadCloudflareCredentials, pipeRedacted } from "./cloudflare-client.mjs";

const args = process.argv.slice(2);
try {
  if (!args.length || args[0] === "status") {
    console.log(JSON.stringify(await cloudflareStatus(), null, 2));
  } else {
    if (["auth", "login", "logout"].includes(args[0]))
      throw Error(
        "This wrapper uses the saved workspace API token; authentication-changing commands are excluded.",
      );
    const credentials = loadCloudflareCredentials();
    const root = fileURLToPath(new URL("../", import.meta.url));
    const logPath = fileURLToPath(new URL("../.qa/cloudflare/wrangler.log", import.meta.url));
    mkdirSync(fileURLToPath(new URL("../.qa/cloudflare", import.meta.url)), { recursive: true });
    const child = spawn(
      process.execPath,
      [
        fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url)),
        ...args,
      ],
      {
        cwd: root,
        env: {
          ...process.env,
          CLOUDFLARE_API_TOKEN: credentials.token,
          CLOUDFLARE_ACCOUNT_ID: credentials.accountId,
          CLOUDFLARE_API_BASE_URL: "https://api.cloudflare.com/client/v4",
          CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
          WRANGLER_SEND_METRICS: "false",
          WRANGLER_SEND_ERROR_REPORTS: "false",
          WRANGLER_LOG_SANITIZE: "true",
          WRANGLER_LOG_PATH: logPath,
        },
        stdio: ["inherit", "pipe", "pipe"],
      },
    );
    for (const [stream, output] of [
      [child.stdout, process.stdout],
      [child.stderr, process.stderr],
    ]) {
      pipeRedacted(stream, output, credentials.token);
    }
    const signals = ["SIGINT", "SIGTERM"];
    for (const signal of signals) process.on(signal, () => child.kill(signal));
    child.on("error", () => {
      console.error("Wrangler could not start. Restore pinned dependencies with npm ci.");
      process.exitCode = 1;
    });
    child.on("exit", (code) => {
      process.exitCode = code ?? 1;
    });
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Cloudflare command failed.");
  process.exitCode = 1;
}
