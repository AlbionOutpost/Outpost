import { db } from "../db";
import { can, resolveAccess } from "../groups/permissions";
export async function editorOptions(userId: string) {
  const [memberships, builds] = await Promise.all([
    db.groupMember.findMany({
      where: { userId },
      select: {
        group: { select: { id: true, name: true, ownerId: true } },
        roles: { select: { role: { select: { position: true, permissions: true } } } },
      },
      take: 200,
    }),
    db.build.findMany({
      where: { hiddenAt: null, OR: [{ authorId: userId }, { visibility: "PUBLIC" }] },
      select: { id: true, title: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
  ]);
  // Only the teams where this player may save comps right now; the save re-checks.
  const groups = memberships
    .filter((m) =>
      can(
        resolveAccess(
          m.group.ownerId === userId,
          m.roles.map((r) => r.role),
        ),
        "manageComps",
      ),
    )
    .map((m) => ({ id: m.group.id, name: m.group.name }));
  return { groups, builds };
}
