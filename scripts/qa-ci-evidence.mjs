import { existsSync, readFileSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
export function redactLog(value, secrets) {
  let result = value;
  for (const secret of secrets.filter((value) => typeof value === "string" && value.length >= 8))
    result = result.replaceAll(secret, "[REDACTED]");
  return result
    .replace(/((?:authorization|cookie|set-cookie)\s*[:=]\s*)[^\r\n]+/gi, "$1[REDACTED]")
    .replace(/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/g, "$1[REDACTED]@");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (existsSync(".env")) process.loadEnvFile(".env");
  const secrets = Object.entries(process.env)
    .filter(([key]) => /SECRET|TOKEN|PASSWORD|DATABASE_URL|REDIS_URL/.test(key))
    .map(([, value]) => value);
  mkdirSync(".qa/ci-evidence", { recursive: true });
  for (const name of readdirSync(".qa").filter(
    (name) => /^phase-[a-z-]+\.log$/.test(name) || name === "phase-summary.json",
  )) {
    const text = redactLog(readFileSync(`.qa/${name}`, "utf8"), secrets);
    writeFileSync(`.qa/ci-evidence/${name}`, text);
  }
  if (existsSync(".qa/phase-summary.json")) {
    const summary = JSON.parse(readFileSync(".qa/phase-summary.json", "utf8"));
    for (const check of summary.checks.filter((check) => check.status !== "PASS")) {
      const path = `.qa/ci-evidence/phase-${check.name}.log`;
      console.log(`Failed check: ${check.name} (${check.status})`);
      if (existsSync(path))
        console.log(readFileSync(path, "utf8").split("\n").slice(-70).join("\n"));
    }
  }
}
