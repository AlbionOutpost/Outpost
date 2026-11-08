import { Prisma } from "@/lib/prisma-runtime";
import { db, databaseService } from "../db";
import { HttpError } from "../http-error";
import { retrySerialization } from "../serialization-retry";
import { lastDroppedRevision, storageLimits, tooManyBuilds } from "../storage-limits";
import { buildInput, type BuildInput, canReadBuild } from "./validation";
type Tx = Prisma.TransactionClient;

/** Refuses a new build once the account keeps the most builds allowed. */
async function requireBuildRoom(tx: Tx, userId: string) {
  if ((await tx.build.count({ where: { authorId: userId } })) >= storageLimits.builds)
    throw tooManyBuilds();
}
/** Serializable, so two saves at once cannot both take the last free place. */
function serializable<T>(work: (tx: Tx) => Promise<T>) {
  return retrySerialization(() =>
    db.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  ).catch((error) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
      throw new HttpError(503, "Save is temporarily busy. Your draft is retained; retry shortly.");
    throw error;
  });
}

async function localCreateBuild(userId: string, data: BuildInput) {
  const parsed = buildInput.parse(data);
  const { equipment, ...fields } = parsed;
  return serializable(async (tx) => {
    await requireBuildRoom(tx, userId);
    return tx.build.create({
      data: {
        ...fields,
        authorId: userId,
        equipment: { create: equipment },
        versions: { create: { version: 1, snapshot: parsed } },
      },
      select: { id: true, version: true },
    });
  });
}
async function localReviseBuild(id: string, userId: string, data: BuildInput, version: number) {
  const { equipment, ...fields } = buildInput.parse(data);
  return db.$transaction(async (tx) => {
    const changed = await tx.build.updateMany({
      where: { id, authorId: userId, version },
      data: { ...fields, version: { increment: 1 } },
    });
    if (!changed.count)
      throw new HttpError(409, "The build changed or you do not own it. Reload before saving.");
    await tx.buildEquipment.deleteMany({ where: { buildId: id } });
    await tx.buildEquipment.createMany({ data: equipment.map((e) => ({ ...e, buildId: id })) });
    await tx.buildVersion.create({ data: { buildId: id, version: version + 1, snapshot: data } });
    // Only the newest revisions are kept; the trim is part of the same save.
    await tx.buildVersion.deleteMany({
      where: { buildId: id, version: { lte: lastDroppedRevision(version + 1) } },
    });
    return { id, version: version + 1 };
  });
}
async function localDuplicateBuild(id: string, userId: string) {
  return serializable(async (tx) => {
    const build = await tx.build.findUnique({ where: { id }, include: { equipment: true } });
    if (
      !build ||
      (build.hiddenAt && build.authorId !== userId) ||
      !canReadBuild(build.visibility, build.authorId, userId)
    )
      throw new HttpError(404, "Build not found");
    await requireBuildRoom(tx, userId);
    const snapshot = buildInput.parse({
      ...build,
      title: `${build.title.slice(0, 90)} (copy)`,
      visibility: "PRIVATE",
    });
    const { equipment, ...data } = snapshot;
    return tx.build.create({
      data: {
        ...data,
        authorId: userId,
        equipment: { create: equipment },
        versions: { create: { version: 1, snapshot } },
      },
      select: { id: true, version: true },
    });
  });
}

export const createBuild: typeof localCreateBuild = (...args) =>
  databaseService<Awaited<ReturnType<typeof localCreateBuild>>>("createBuild", args) ??
  localCreateBuild(...args);

export const reviseBuild: typeof localReviseBuild = (...args) =>
  databaseService<Awaited<ReturnType<typeof localReviseBuild>>>("reviseBuild", args) ??
  localReviseBuild(...args);

export const duplicateBuild: typeof localDuplicateBuild = (...args) =>
  databaseService<Awaited<ReturnType<typeof localDuplicateBuild>>>("duplicateBuild", args) ??
  localDuplicateBuild(...args);
