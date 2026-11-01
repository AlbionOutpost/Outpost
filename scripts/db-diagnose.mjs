import net from "node:net";
import { mkdirSync, writeFileSync } from "node:fs";
try {
  process.loadEnvFile(".env");
} catch {}
const output = process.argv.includes("--qa")
  ? ".qa/db-qa-diagnostics.json"
  : ".qa/db-direct-diagnostics.json";
let report;
try {
  const target = new URL(process.env.DATABASE_URL || "");
  if (!["postgres:", "postgresql:"].includes(target.protocol)) throw new Error();
  const result = await new Promise((resolve) => {
    const socket = net.createConnection({
      host: target.hostname,
      port: Number(target.port || 5432),
    });
    socket.setTimeout(2500);
    socket.once("connect", () => {
      socket.destroy();
      resolve({ status: "PASS", code: "TCP_CONNECTED" });
    });
    socket.once("error", (error) =>
      resolve({ status: "BLOCKED", code: error.code || "NETWORK_ERROR" }),
    );
    socket.once("timeout", () => {
      socket.destroy();
      resolve({ status: "BLOCKED", code: "TIMEOUT" });
    });
  });
  report = {
    checkedAt: new Date().toISOString(),
    configured: true,
    credentialsPresent: !!target.username && !!target.password,
    loopback: ["localhost", "127.0.0.1", "::1"].includes(target.hostname),
    port: Number(target.port || 5432),
    ...result,
    scope:
      "TCP connectivity only. No credentials printed, migrations applied, or authentication certification.",
  };
} catch {
  report = {
    checkedAt: new Date().toISOString(),
    configured: false,
    status: "FAIL",
    code: "INVALID_DATABASE_CONFIGURATION",
  };
}
mkdirSync(".qa", { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
if (report.status !== "PASS") process.exitCode = 1;
