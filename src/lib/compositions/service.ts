import { Prisma } from "@/lib/prisma-runtime";
import type { ContentVisibility } from "@prisma/client";
import { db, databaseService } from "../db";
import { retrySerialization } from "../serialization-retry";
import { HttpError } from "../http-error";
import { can, type TeamAccess } from "../groups/permissions";
import { loadTeamAccess } from "../groups/roles";
import { compositionInput, type CompositionInput } from "./validation";
import { readStoredComposition } from "./stored";
type Client = Prisma.TransactionClient;
/** The viewer's current rights in a comp's team (null outside it). */
export function groupAccess(client: Client, groupId: string, userId?: string) {
  return loadTeamAccess(client, groupId, userId);
}
/** Team comps: Manage comps edits any and deletes your own; Manage team also deletes anyone's. */
export function canDeleteShared(access: TeamAccess | null, author: boolean) {
  return (
    (author && can(access, "manageComps")) ||
    (can(access, "manageComps") && can(access, "manageTeam"))
  );
}
export async function requireRead(id: string, userId?: string, client: Client = db) {
  const row = await client.composition.findUnique({ where: { id } });
  if (!row || (row.hiddenAt && row.authorId !== userId))
    throw new HttpError(404, "Composition not found");
  if (row.visibility === "PUBLIC" || (row.visibility === "PRIVATE" && row.authorId === userId))
    return row;
  if (row.visibility === "GROUP" && row.groupId && (await groupAccess(client, row.groupId, userId)))
    return row;
  throw new HttpError(404, "Composition not found");
}
export async function canEdit(
  row: { authorId: string; visibility: ContentVisibility; groupId: string | null },
  userId: string,
  client: Client = db,
) {
  return row.visibility === "GROUP" && row.groupId
    ? can(await groupAccess(client, row.groupId, userId), "manageComps")
    : row.authorId === userId;
}
async function validateDestination(
  data: CompositionInput,
  userId: string,
  client: Client,
  existingSources = new Set<string>(),
) {
  if (data.groupId && !can(await groupAccess(client, data.groupId, userId), "manageComps"))
    throw new HttpError(403, "Saving team comps needs the Manage comps permission");
  for (const id of new Set(
    data.slots.map((s) => s.sourceBuildId).filter((id): id is string => !!id),
  )) {
    if (existingSources.has(id)) continue;
    const build = await client.build.findUnique({ where: { id } });
    if (!build || ((build.visibility === "PRIVATE" || build.hiddenAt) && build.authorId !== userId))
      throw new HttpError(403, "An attached build is not accessible");
  }
}
async function localSaveComposition(userId: string, input: unknown, id?: string, version?: number) {
  const data = compositionInput.parse(input);
  return retrySerialization(() =>
    db.$transaction(
      async (tx) => {
        const existingSources = new Set<string>();
        if (id) {
          const current = await requireRead(id, userId, tx);
          // Older rows may hold member ids from before today's rules; read them leniently.
          for (const slot of readStoredComposition(current).composition.slots)
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
async function localDuplicateComposition(id: string, userId: string) {
  const row = await requireRead(id, userId);
  // The copy is built from what the stored comp still holds and then fully validated.
  const input = compositionInput.parse({
    ...readStoredComposition(row).composition,
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

async function localDeleteComposition(id: string, userId: string) {
  await db.$transaction(async (tx) => {
    const row = await requireRead(id, userId, tx);
    const access = row.groupId ? await groupAccess(tx, row.groupId, userId) : null;
    const permitted =
      row.visibility === "GROUP"
        ? canDeleteShared(access, row.authorId === userId)
        : row.authorId === userId;
    if (!permitted) throw new HttpError(403, "You cannot delete this composition");
    await tx.composition.delete({ where: { id } });
  });
}

export const saveComposition: typeof localSaveComposition = (...args) =>
  databaseService<Awaited<ReturnType<typeof localSaveComposition>>>("saveComposition", args) ??
  localSaveComposition(...args);

export const duplicateComposition: typeof localDuplicateComposition = (...args) =>
  databaseService<Awaited<ReturnType<typeof localDuplicateComposition>>>(
    "duplicateComposition",
    args,
  ) ?? localDuplicateComposition(...args);

export const deleteComposition: typeof localDeleteComposition = (...args) =>
  databaseService<Awaited<ReturnType<typeof localDeleteComposition>>>("deleteComposition", args) ??
  localDeleteComposition(...args);
