import { db } from "../db";
import { HttpError } from "../api-errors";
import { buildInput, type BuildInput, canReadBuild } from "./validation";
export async function reviseBuild(id: string, userId: string, data: BuildInput, version: number) {
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
    return { id, version: version + 1 };
  });
}
export async function duplicateBuild(id: string, userId: string) {
  const build = await db.build.findUnique({ where: { id }, include: { equipment: true } });
  if (
    !build ||
    (build.hiddenAt && build.authorId !== userId) ||
    !canReadBuild(build.visibility, build.authorId, userId)
  )
    throw new HttpError(404, "Build not found");
  const snapshot = buildInput.parse({
    ...build,
    title: `${build.title.slice(0, 90)} (copy)`,
    visibility: "PRIVATE",
  });
  const { equipment, ...data } = snapshot;
  return db.build.create({
    data: {
      ...data,
      authorId: userId,
      equipment: { create: equipment },
      versions: { create: { version: 1, snapshot } },
    },
    select: { id: true, version: true },
  });
}
