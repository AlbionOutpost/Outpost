import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
let file = {};
try {
  file = parseEnv(readFileSync(".env.cloudflare-runtime", "utf8"));
} catch {}
const values = { ...file, ...process.env };
const id = values.CLOUDFLARE_CATALOG_DATABASE_ID;
const sitekey = values.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
if (!/^[a-f0-9-]{36}$/.test(id ?? "") || /^0+-0+-0+-0+-0+$/.test(id))
  throw new Error("Explicit reviewed catalog database selection required");
if (!/^0x[A-Za-z0-9_-]+$/.test(sitekey ?? ""))
  throw new Error("Production Turnstile site key required");
const read = (path) => JSON.parse(readFileSync(path, "utf8").replace(/,\s*([}\]])/g, "$1"));
const data = read("cloudflare/database/wrangler.jsonc");
data.main = resolve("cloudflare/database/worker.ts");
data.alias = Object.fromEntries(
  Object.entries(data.alias).map(([name, path]) => [name, resolve("cloudflare/database", path)]),
);
data.d1_databases[0].database_id = id;
const web = read("wrangler.jsonc");
web.main = resolve("cloudflare/web/worker.ts");
web.assets.directory = resolve(".open-next/assets");
web.vars = {
  OUTPOST_RUNTIME: "cloudflare",
  NEXTAUTH_URL: "https://albionoutpost.com",
  DISCORD_CLIENT_ID: "1564994799722045560",
  OUTPOST_OWNER_DISCORD_ID: "303585687460904970",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: sitekey,
  TURNSTILE_HOSTNAMES: "albionoutpost.com,www.albionoutpost.com",
  // Optional: the AdSense publisher id turns the loader, ads.txt and the CSP origins on; the
  // two unit ids turn the placements on.
  ...(/^ca-pub-\d{6,20}$/.test(values.NEXT_PUBLIC_ADSENSE_CLIENT ?? "")
    ? {
        NEXT_PUBLIC_ADSENSE_CLIENT: values.NEXT_PUBLIC_ADSENSE_CLIENT,
        ...Object.fromEntries(
          ["NEXT_PUBLIC_ADSENSE_SLOT_HUB", "NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE"]
            .filter((name) => /^\d{6,20}$/.test(values[name] ?? ""))
            .map((name) => [name, values[name]]),
        ),
      }
    : {}),
};
// Domain attachment is managed separately. Routine releases preserve the existing owned domains.
const directory = ".qa/cloudflare-release";
mkdirSync(directory, { recursive: true });
for (const [name, config] of Object.entries({ data, web }))
  writeFileSync(`${directory}/${name}.jsonc`, JSON.stringify(config, null, 2));
console.log(
  JSON.stringify({
    configsPrepared: true,
    workerNames: [data.name, web.name],
    containsRuntimeSecrets: false,
    publicRoutesAdded: false,
  }),
);
