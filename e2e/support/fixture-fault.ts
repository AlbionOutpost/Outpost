import type { PrismaClient } from "@prisma/client";
import { cloudflareFixture } from "./cloudflare-db";
export async function fixtureFault(
  db: PrismaClient,
  id: string,
  action: "update" | "delete" | null,
) {
  if (!/^atlas-test-[a-f0-9]{32}$/.test(id))
    throw new Error("Fault injection requires a generated isolated fixture ID");
  if (process.env.E2E_CLOUDFLARE === "1") return cloudflareFixture("fault", [id, action]);
  const tag = id.slice("atlas-test-".length),
    functionName = `atlas_qa_settings_${tag}`,
    triggerName = `atlas_qa_settings_trigger_${tag}`;
  await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${triggerName}" ON "User"`);
  if (!action) {
    await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${functionName}"()`);
    return;
  }
  await db.$executeRawUnsafe(
    `CREATE OR REPLACE FUNCTION "${functionName}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.id = '${id}' THEN RAISE EXCEPTION 'QA fixture service failure'; END IF; IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW; END $$`,
  );
  await db.$executeRawUnsafe(
    `CREATE TRIGGER "${triggerName}" BEFORE ${action.toUpperCase()} ON "User" FOR EACH ROW EXECUTE FUNCTION "${functionName}"()`,
  );
}
