import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync(".qa", { recursive: true });
const checks = [];
const commands = [
  ["database-connectivity", ["node", "scripts/db-diagnose.mjs", "--qa"]],
  ["typecheck", ["npm", "run", "typecheck"]],
  ["lint", ["npm", "run", "lint"]],
  ["unit", ["npm", "test"]],
  ["game-data-structure", ["node", "--import", "tsx", "scripts/audit-game-data.ts", "--check"]],
  ["database-integration", ["npm", "run", "test:integration"]],
  ["build", ["npm", "run", "build"]],
  ["browser", ["npm", "run", "test:e2e"]],
  ["dependencies", ["npm", "audit", "--json"]],
  ["live-regions", ["npm", "run", "test:live"]],
];
for (const [name, [command, ...args]] of commands) {
  if (name === "browser" && checks.find((c) => c.name === "build")?.status !== "PASS") {
    checks.push({ name, status: "BLOCKED", reason: "Build failed" });
    continue;
  }
  const start = performance.now();
  const result = spawnSync(command, args, {
    env: { ...process.env, E2E_PRODUCTION: "1" },
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  writeFileSync(`.qa/phase-${name}.log`, (result.stdout || "") + (result.stderr || ""));
  checks.push({
    name,
    status: result.status === 0 ? "PASS" : "FAIL",
    seconds: Math.round((performance.now() - start) / 10) / 100,
  });
  console.log(JSON.stringify(checks.at(-1)));
}
const summary = {
  checkedAt: new Date().toISOString(),
  checks,
  manualGates: {
    actualDiscordOAuth: "BLOCKED until real credentialed verification",
    legalReview: "BLOCKED until operator/legal review",
    fullProduct: "NOT IMPLEMENTED",
    visualReview: "Required for each phase; inspect newly captured screenshots",
    containerAndLighthouse:
      "Run for deployment/infrastructure/UI changes; not silently implied by this command",
  },
  releaseVerdict: "NO-GO",
};
writeFileSync(".qa/phase-summary.json", JSON.stringify(summary, null, 2));
if (checks.some((c) => c.status !== "PASS")) process.exitCode = 1;
