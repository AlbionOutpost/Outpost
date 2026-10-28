import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseEnv } from "node:util";

/** Return categories only: never include matched credential values in logs or artifacts. */
export function scanText(text, configured = {}) {
  const matches = [];
  for (const [key, value] of Object.entries(configured))
    if (value && value.length >= 12 && text.includes(value)) matches.push(`configured:${key}`);
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) matches.push("private-key");
  if (/\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})\b/.test(text))
    matches.push("github-token");
  if (/\bcf(?:at|ut|k)_[A-Za-z0-9_-]{40,}\b/.test(text)) matches.push("cloudflare-token");
  return matches;
}

function main() {
  try {
    process.loadEnvFile(".env");
  } catch {}
  let managementSecrets = {};
  for (const path of [".env.cloudflare", ".env.discord"])
    try {
      Object.assign(managementSecrets, parseEnv(readFileSync(path, "utf8")));
    } catch {}
  const values = { ...process.env, ...managementSecrets };
  const configured = Object.fromEntries(
    [
      "NEXTAUTH_SECRET",
      "DISCORD_CLIENT_SECRET",
      "DISCORD_BOT_TOKEN",
      "TURNSTILE_SECRET",
      "CLOUDFLARE_API_TOKEN",
      "CLOUDFLARE_DNS_API_TOKEN",
      "CLOUDFLARE_API_KEY",
    ]
      .filter((key) => values[key])
      .map((key) => [key, values[key]]),
  );
  const skipped = new Set([
    "node_modules",
    ".git",
    ".next",
    ".qa",
    "test-results",
    "playwright-report",
    ".agents",
    ".codex",
    ".aws",
    "assets",
  ]);
  const textFile = /\.(?:[cm]?js|tsx?|py|md|json|ya?ml|toml)$/;
  const findings = [];
  let filesScanned = 0;
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (
        entry.isSymbolicLink() ||
        skipped.has(entry.name) ||
        (entry.name.startsWith(".env") && entry.name !== ".env.example")
      )
        continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && (textFile.test(entry.name) || entry.name === ".env.example")) {
        filesScanned++;
        const categories = scanText(readFileSync(path, "utf8"), configured);
        if (categories.length) findings.push({ file: path, categories });
      }
    }
  }
  walk(".");
  const result = {
    filesScanned,
    configuredKeys: Object.keys(configured),
    findings,
    scope:
      "Candidate source/config text only; ignored environments/generated files excluded. No Git history scan or complete secret-audit certification.",
  };
  mkdirSync(".qa", { recursive: true });
  writeFileSync(".qa/repository-source-scan.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  if (findings.length) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
