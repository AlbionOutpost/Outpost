import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const directory = "cloudflare/generated";
mkdirSync(directory, { recursive: true });
const source = readFileSync("cloudflare/d1/schema.prisma", "utf8")
  .replace(
    'provider = "prisma-client-js"',
    'provider = "prisma-client-js"\n  output = "./prisma"\n  engineType = "client"',
  )
  .replace('env("D1_MIGRATION_URL")', '"file:unused.db"');
writeFileSync(`${directory}/schema.prisma`, source);
const result = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "generate", "--schema", `${directory}/schema.prisma`],
  { stdio: "inherit", env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: "1" } },
);
process.exitCode = result.status ?? 1;
