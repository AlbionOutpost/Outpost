import { db, databaseService } from "../db";
import { Prisma } from "../prisma-runtime";
import { HttpError } from "../http-error";
import { canEditShared } from "./permissions";
import { allocateLoot, lootSave } from "./loot";
import { z } from "zod";

async function localTeamLoot(groupId: string, userId: string, input?: unknown) {
  z.string().min(1).max(100).parse(groupId);
  z.string().min(1).max(100).parse(userId);
  const parsed = input === undefined ? null : lootSave.parse(input);
  return db
    .$transaction(
      async (tx) => {
        const member = await tx.groupMember.findUnique({
          where: { groupId_userId: { groupId, userId } },
        });
        if (!member) throw new HttpError(404, "Team not found");
        if (!parsed)
          return tx.groupLootSplit.findMany({
            where: { groupId },
            orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
            take: 50,
          });
        if (!canEditShared(member.role))
          throw new HttpError(403, "Officers and administrators manage team loot splits");
        const eligible = await tx.groupMember.count({
          where: {
            groupId,
            userId: { in: parsed.configuration.participants.map((p) => p.userId) },
          },
        });
        if (eligible !== parsed.configuration.participants.length)
          throw new HttpError(
            409,
            "A participant is no longer a team member. Review the split before saving.",
          );
        allocateLoot(parsed.configuration);
        if (parsed.id) {
          const changed = await tx.groupLootSplit.updateMany({
            where: { id: parsed.id, groupId, version: parsed.version },
            data: {
              title: parsed.title,
              configuration: parsed.configuration,
              version: { increment: 1 },
            },
          });
          if (!changed.count)
            throw new HttpError(
              409,
              "This loot split changed or is unavailable. Your draft is retained; reopen the saved split before editing.",
            );
          return tx.groupLootSplit.findFirstOrThrow({ where: { id: parsed.id, groupId } });
        }
        return tx.groupLootSplit.create({
          data: {
            groupId,
            title: parsed.title,
            configuration: parsed.configuration,
            createdById: userId,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
    .catch((error) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
        throw new HttpError(409, "Team membership or the split changed. Refresh and retry.");
      throw error;
    });
}
export const teamLoot: typeof localTeamLoot = (...args) =>
  databaseService<Awaited<ReturnType<typeof localTeamLoot>>>("teamLoot", args) ??
  localTeamLoot(...args);
