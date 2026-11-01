import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { configuredSecrets } from "./secret-values.mjs";
try {
  process.loadEnvFile(".env");
} catch {}
const secrets = configuredSecrets();
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
