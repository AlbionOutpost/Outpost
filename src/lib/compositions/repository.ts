import { db } from "../db";
export async function editorOptions(userId: string) {
  const [memberships, builds] = await Promise.all([
    db.groupMember.findMany({
      where: { userId, role: { in: ["OWNER", "ADMIN", "OFFICER"] } },
      select: { group: { select: { id: true, name: true } } },
    }),
    db.build.findMany({
      where: { hiddenAt: null, OR: [{ authorId: userId }, { visibility: "PUBLIC" }] },
      select: { id: true, title: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
  ]);
  return { groups: memberships.map((m) => m.group), builds };
}
