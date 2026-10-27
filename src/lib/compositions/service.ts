import { Prisma, type ContentVisibility } from "@prisma/client";
import { db } from "../db";
import { retrySerialization } from "../serialization-retry";
import { HttpError } from "../api-errors";
import { canEditShared } from "../groups/permissions";
import { compositionInput, type CompositionInput } from "./validation";
type Client = Prisma.TransactionClient;
export async function groupRole(client: Client, groupId: string, userId?: string) {
  if (!userId) return null;
  const member = await client.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  return member?.role ?? null;
}
export async function requireRead(id: string, userId?: string, client: Client = db) {
  const row = await client.composition.findUnique({ where: { id } });
  if (!row || (row.hiddenAt && row.authorId !== userId))
    throw new HttpError(404, "Composition not found");
  if (row.visibility === "PUBLIC" || (row.visibility === "PRIVATE" && row.authorId === userId))
    return row;
  if (row.visibility === "GROUP" && row.groupId && (await groupRole(client, row.groupId, userId)))
    return row;
  throw new HttpError(404, "Composition not found");
}
export async function canEdit(
  row: { authorId: string; visibility: ContentVisibility; groupId: string | null },
  userId: string,
  client: Client = db,
) {
  return row.visibility === "GROUP" && row.groupId
    ? canEditShared(await groupRole(client, row.groupId, userId))
    : row.authorId === userId;
}
async function validateDestination(
  data: CompositionInput,
  userId: string,
  client: Client,
  existingSources = new Set<string>(),
) {
  if (data.groupId && !canEditShared(await groupRole(client, data.groupId, userId)))
    throw new HttpError(403, "An officer, admin or owner must save group compositions");
  for (const id of new Set(
    data.slots.map((s) => s.sourceBuildId).filter((id): id is string => !!id),
  )) {
    if (existingSources.has(id)) continue;
    const build = await client.build.findUnique({ where: { id } });
    if (!build || ((build.visibility === "PRIVATE" || build.hiddenAt) && build.authorId !== userId))
      throw new HttpError(403, "An attached build is not accessible");
  }
}
export async function saveComposition(
  userId: string,
  input: unknown,
  id?: string,
  version?: number,
) {
  const data = compositionInput.parse(input);
  return retrySerialization(() =>
    db.$transaction(
      async (tx) => {
        const existingSources = new Set<string>();
        if (id) {
          const current = await requireRead(id, userId, tx);
          for (const slot of compositionInput.parse(current).slots)
            if (slot.sourceBuildId) existingSources.add(slot.sourceBuildId);
          if (!(await canEdit(current, userId, tx)))
            throw new HttpError(403, "You cannot edit this composition");
          if (
            (data.visibility !== current.visibility || data.groupId !== current.groupId) &&
            current.authorId !== userId
          )
            throw new HttpError(403, "Only the author can move or republish a shared composition");
        }
        await validateDestination(data, userId, tx, existingSources);
        const record = { ...data, slots: data.slots as Prisma.InputJsonValue };
        if (id) {
          const update = await tx.composition.updateMany({
            where: { id, version },
            data: { ...record, version: { increment: 1 } },
          });
          if (!update.count)
            throw new HttpError(
              409,
              "This composition changed. Reload before saving to avoid overwriting another editor.",
            );
          await tx.compositionVersion.create({
            data: {
              compositionId: id,
              version: version! + 1,
              snapshot: data as Prisma.InputJsonValue,
            },
          });
          return { id, version: version! + 1 };
        }
        const created = await tx.composition.create({
          data: {
            ...record,
            authorId: userId,
            versions: { create: { version: 1, snapshot: data as Prisma.InputJsonValue } },
          },
          select: { id: true, version: true },
        });
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  ).catch((error) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
      throw new HttpError(503, "Save is temporarily busy. Your draft is retained; retry shortly.");
    throw error;
  });
}
export async function duplicateComposition(id: string, userId: string) {
  const row = await requireRead(id, userId);
  const input = compositionInput.parse({
    ...row,
    title: `${row.title.slice(0, 90)} (copy)`,
    visibility: "PRIVATE",
    groupId: null,
  });
  input.slots = input.slots.map((slot) => ({
    ...slot,
    id: crypto.randomUUID(),
    sourceBuildId: null,
  }));
  return saveComposition(userId, input);
}
