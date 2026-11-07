import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
try {
  process.loadEnvFile(".env");
} catch {}
// A bare `next build` (without `npm run build`) leaves the standalone server without its static
// chunks and public files: pages render but never hydrate. Copy them in before serving.
if (!existsSync(".next/standalone/.next/static")) await import("./prepare-standalone.mjs");
const child = spawn(process.execPath, [".next/standalone/server.js"], {
  stdio: "inherit",
  env: { ...process.env, HOSTNAME: "0.0.0.0" },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
