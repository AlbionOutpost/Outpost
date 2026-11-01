import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
try {
  process.loadEnvFile(".env");
} catch {}
const base = new URL(process.env.DATABASE_URL || "");
if (!["localhost", "127.0.0.1"].includes(base.hostname))
  throw new Error("Database audit requires local PostgreSQL");
mkdirSync(".qa", { recursive: true });
const suffix = randomUUID().replaceAll("-", "").slice(0, 12),
  source = `atlas_qa_${suffix}`,
  restored = `atlas_restore_${suffix}`;
const results = [];
const docker = (args, input) =>
  spawnSync("docker", ["compose", "exec", "-T", "db", ...args], {
    input,
    encoding: input instanceof Buffer ? undefined : "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
function required(result, name) {
  if (result.status !== 0) throw new Error(`${name} failed: ${String(result.stderr).slice(-500)}`);
  return result;
}
function sql(database, statement) {
  return docker([
    "psql",
    "-X",
    "-v",
    "ON_ERROR_STOP=1",
    "-U",
    "atlas",
    "-d",
    database,
    "-Atc",
    statement,
  ]);
}
function check(name, passed) {
  results.push({ name, passed });
  console.log(JSON.stringify(results.at(-1)));
}
const created = [];
try {
  required(docker(["createdb", "-U", "atlas", source]), "create disposable database");
  created.push(source);
  const url = new URL(base);
  url.pathname = `/${source}`;
  const migration = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: url.toString() },
    encoding: "utf8",
  });
  required(migration, "fresh migrations");
  check("fresh migrations", true);
  required(
    sql(
      source,
      `INSERT INTO "User" (id,name,"updatedAt") VALUES ('qa-user','QA only',now()); INSERT INTO "Build" (id,"authorId",title,description,"contentType",region,strategy,"patchNotes","updatedAt") VALUES ('qa-build','qa-user','QA build','','Other','europe','','',now()); INSERT INTO "BuildEquipment" (id,"buildId",slot,"itemId",quality,abilities,alternatives) VALUES ('qa-equipment','qa-build','Main hand','T4_BAG',1,'',''); INSERT INTO "BuildVersion" (id,"buildId",version,snapshot) VALUES ('qa-version','qa-build',1,'{}');`,
    ),
    "fixture",
  );
  required(
    sql(
      source,
      `INSERT INTO "MarketWatchItem" (id,"userId",region,"itemId",quality) VALUES ('qa-watch','qa-user','europe','T4_BAG',1);`,
    ),
    "watch fixture",
  );
  for (const [name, statement] of [
    ["watch quality constraint", `BEGIN; UPDATE "MarketWatchItem" SET quality=6; ROLLBACK;`],
    ["watch region constraint", `BEGIN; UPDATE "MarketWatchItem" SET region='invalid'; ROLLBACK;`],
    [
      "watch item identity constraint",
      `BEGIN; UPDATE "MarketWatchItem" SET "itemId"='../invalid'; ROLLBACK;`,
    ],
    [
      "watch duplicate identity constraint",
      `BEGIN; INSERT INTO "MarketWatchItem" (id,"userId",region,"itemId",quality) VALUES ('qa-watch-duplicate','qa-user','europe','T4_BAG',1); ROLLBACK;`,
    ],
    ["quality range constraint", `BEGIN; UPDATE "BuildEquipment" SET quality=6; ROLLBACK;`],
    ["player count constraint", `BEGIN; UPDATE "Build" SET "playerCount"=-1; ROLLBACK;`],
    ["region constraint", `BEGIN; UPDATE "Build" SET region='invalid'; ROLLBACK;`],
    [
      "equipment slot uniqueness",
      `BEGIN; INSERT INTO "BuildEquipment" (id,"buildId",slot,"itemId",quality,abilities,alternatives) VALUES ('qa-duplicate','qa-build','Main hand','T4_BAG',1,'',''); ROLLBACK;`,
    ],
    ["foreign key constraint", `BEGIN; UPDATE "Build" SET "authorId"='missing-user'; ROLLBACK;`],
  ])
    check(name, sql(source, statement).status !== 0);
  check(
    "failed watch write aborts",
    sql(
      source,
      `BEGIN; INSERT INTO "MarketWatchItem" (id,"userId",region,"itemId",quality) VALUES ('qa-transient-watch','qa-user','europe','T4_CAPE',1); UPDATE "MarketWatchItem" SET quality=6; COMMIT;`,
    ).status !== 0,
  );
  check(
    "watch rollback preserves existing records",
    String(
      required(sql(source, `SELECT count(*) FROM "MarketWatchItem";`), "watch rollback count")
        .stdout,
    ).trim() === "1",
  );
  const dump = required(
    spawnSync(
      "docker",
      ["compose", "exec", "-T", "db", "pg_dump", "-U", "atlas", "-d", source, "-Fc"],
      { maxBuffer: 20 * 1024 * 1024 },
    ),
    "backup",
  );
  writeFileSync(".qa/database-fixture.dump", dump.stdout);
  required(docker(["createdb", "-U", "atlas", restored]), "create restore target");
  created.push(restored);
  required(
    docker(["pg_restore", "-U", "atlas", "-d", restored, "--exit-on-error"], dump.stdout),
    "restore",
  );
  const restoredCounts = required(
    sql(
      restored,
      `SELECT (SELECT count(*) FROM "User"),(SELECT count(*) FROM "Build"),(SELECT count(*) FROM "BuildEquipment"),(SELECT count(*) FROM "BuildVersion"),(SELECT count(*) FROM "MarketWatchItem");`,
    ),
    "restore counts",
  );
  check(
    "backup restores records and relationships",
    String(restoredCounts.stdout).trim() === "1|1|1|1|1",
  );
  required(sql(restored, `DELETE FROM "User" WHERE id='qa-user';`), "cascade delete");
  const counts = required(
    sql(
      restored,
      `SELECT (SELECT count(*) FROM "Build"),(SELECT count(*) FROM "BuildEquipment"),(SELECT count(*) FROM "BuildVersion"),(SELECT count(*) FROM "MarketWatchItem");`,
    ),
    "cascade counts",
  );
  check(
    "account cascade leaves no orphaned builds or revisions",
    String(counts.stdout).trim() === "0|0|0|0",
  );
  required(
    spawnSync("npx", ["prisma", "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: url.toString() },
      encoding: "utf8",
    }),
    "migration rerun",
  );
  check("existing migrations rerun safely", true);
} finally {
  for (const name of created)
    required(docker(["dropdb", "-U", "atlas", name]), "remove owned disposable database");
  writeFileSync(
    `.qa/database-${process.argv.includes("--baseline") ? "baseline" : "final"}.json`,
    JSON.stringify(
      { scope: "Fresh disposable local databases; no existing application data modified", results },
      null,
      2,
    ),
  );
}
if (results.some((r) => !r.passed)) process.exitCode = 1;
