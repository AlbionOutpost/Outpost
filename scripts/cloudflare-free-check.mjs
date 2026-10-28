import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
const folder = resolve(".qa/cloudflare-release");
mkdirSync(folder, { recursive: true });
const results = [];
for (const name of ["data", "web"]) {
  const config = `${folder}/${name}.jsonc`;
  const settings = JSON.parse(readFileSync(config, "utf8"));
  if (
    settings.workers_dev !== false ||
    settings.preview_urls !== false ||
    settings.routes?.length ||
    settings.r2_buckets?.length ||
    settings.images ||
    settings.usage_model
  )
    throw new Error("Free deployment config includes unreviewed public routes or paid services");
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "deploy",
      "--dry-run",
      "--config",
      config,
      "--outdir",
      `${folder}/bundle-${name}`,
    ],
    {
      encoding: "utf8",
      maxBuffer: 5 * 1024 * 1024,
      env: {
        ...process.env,
        XDG_CONFIG_HOME: `${folder}/config`,
        WRANGLER_SEND_METRICS: "false",
        WRANGLER_SEND_ERROR_REPORTS: "false",
        CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
      },
    },
  );
  const output = (result.stdout ?? "") + (result.stderr ?? "");
  const secret = process.env.CLOUDFLARE_API_TOKEN;
  writeFileSync(
    `${folder}/dry-run-${name}.log`,
    secret ? output.replaceAll(secret, "[redacted]") : output,
  );
  const matched = output.match(/gzip:\s*([\d.]+)\s*KiB/);
  if (result.status !== 0 || !matched)
    throw new Error(`${name} Worker dry-run failed; see the sanitized local log`);
  const compressedBytes = Math.ceil(Number(matched[1]) * 1024);
  if (compressedBytes > 3 * 1024 * 1024)
    throw new Error(`${name} Worker exceeds the Cloudflare Free 3 MiB limit`);
  results.push({
    worker: settings.name,
    compressedBytes,
    freeLimitBytes: 3 * 1024 * 1024,
    status: "PASS",
  });
}
const report = {
  checkedAt: new Date().toISOString(),
  results,
  workerEntrySha256: createHash("sha256")
    .update(readFileSync(".open-next/worker.js"))
    .digest("hex"),
  scope:
    "Actual Wrangler bundle dry-runs; not a deployed CPU/quota or production restore certification",
  paidServicesEnabled: false,
};
writeFileSync(`${folder}/free-bundles.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
