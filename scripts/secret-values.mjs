import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
const names = [
  "OUTPOST_RENDER_SESSION_SECRET",
  "CF_ACCESS_CLIENT_SECRET",
  "NEXTAUTH_SECRET",
  "DISCORD_CLIENT_SECRET",
  "DISCORD_BOT_TOKEN",
  "TURNSTILE_SECRET",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_DNS_API_TOKEN",
  "CLOUDFLARE_DEPLOY_API_TOKEN",
  "CLOUDFLARE_API_KEY",
];
/** Keep every configured value, including different local/hosted secrets with the same name. */
export function configuredSecrets() {
  const contexts = [{ name: "environment", values: process.env }];
  for (const path of [
    ".env",
    ".env.cloudflare",
    ".env.discord",
    ".env.cloudflare-ci",
    ".env.cloudflare-runtime",
    ".env.cloudflare-preview",
  ])
    try {
      contexts.push({ name: path, values: parseEnv(readFileSync(path, "utf8")) });
    } catch {}
  const seen = new Set(),
    entries = [];
  for (const context of contexts)
    for (const key of names) {
      const value = context.values[key];
      if (value && !seen.has(`${key}:${value}`)) {
        seen.add(`${key}:${value}`);
        entries.push({ key, value, source: context.name });
      }
    }
  return entries;
}
