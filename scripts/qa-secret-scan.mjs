import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
try {
  process.loadEnvFile(".env");
} catch {}
let managementSecrets = {};
for (const path of [".env.cloudflare", ".env.discord"])
  try {
    Object.assign(managementSecrets, parseEnv(readFileSync(path, "utf8")));
  } catch {}
const values = { ...process.env, ...managementSecrets };
const secrets = [
  "NEXTAUTH_SECRET",
  "DISCORD_CLIENT_SECRET",
  "DISCORD_BOT_TOKEN",
  "TURNSTILE_SECRET",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_DNS_API_TOKEN",
  "CLOUDFLARE_API_KEY",
].flatMap((key) => (values[key] ? [{ key, value: values[key] }] : []));
const matches = [];
let files = 0;
function walk(path) {
  for (const name of readdirSync(path)) {
    const full = `${path}/${name}`;
    if (statSync(full).isDirectory()) walk(full);
    else {
      files++;
      const text = readFileSync(full, "utf8");
      for (const s of secrets)
        if (text.includes(s.value)) matches.push({ file: full, environmentKey: s.key });
    }
  }
}
walk(".next/static");
const result = { filesScanned: files, configuredSecretKeys: secrets.map((s) => s.key), matches };
writeFileSync(".qa/secret-scan.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
if (matches.length) process.exitCode = 1;
