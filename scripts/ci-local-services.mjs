// Prepares the disposable local services a CI job needs: a fixture .env with a random
// NextAuth secret and a fixture-only Discord pair (tests never reach Discord), the Docker
// Postgres and Redis services, the schema and the catalog sync.
import { execSync } from "node:child_process";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
copyFileSync(".env.example", ".env");
writeFileSync(
  ".env",
  readFileSync(".env", "utf8")
    .replace(/^NEXTAUTH_SECRET=.*$/m, `NEXTAUTH_SECRET=${randomBytes(48).toString("hex")}`)
    .replace(/^DISCORD_CLIENT_ID=.*$/m, "DISCORD_CLIENT_ID=100000000000000000")
    .replace(
      /^DISCORD_CLIENT_SECRET=.*$/m,
      `DISCORD_CLIENT_SECRET=${randomBytes(24).toString("hex")}`,
    ),
);
for (const command of ["docker compose up -d --wait", "npm run db:deploy", "npm run data:sync"]) {
  console.log(`$ ${command}`);
  execSync(command, { stdio: "inherit" });
}
