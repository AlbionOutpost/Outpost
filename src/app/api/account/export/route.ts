import { apiHandler } from "@/lib/api-errors";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/redis";
export const GET = apiHandler("account.export", async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (!(await rateLimit(`export:${session.user.id}`, 5, 3600)))
    return NextResponse.json({ error: "Please retry later" }, { status: 429 });
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      region: true,
      characterName: true,
      createdAt: true,
      updatedAt: true,
      savedScenarios: true,
      timers: true,
      marketWatchItems: true,
      buildFavorites: true,
      compositionFavorites: true,
      buildVotes: true,
      comments: { include: { revisions: true } },
      reports: {
        select: {
          id: true,
          buildId: true,
          compositionId: true,
          commentId: true,
          reason: true,
          status: true,
          createdAt: true,
        },
      },
      compositions: { include: { versions: true } },
      memberships: { select: { groupId: true, role: true, joinedAt: true } },
      builds: { include: { equipment: true, versions: true } },
      accounts: { select: { provider: true, providerAccountId: true } },
    },
  });
  return NextResponse.json(
    { exportedAt: new Date().toISOString(), profile: user },
    {
      headers: {
        "Content-Disposition": "attachment; filename=albion-atlas-account.json",
        "Cache-Control": "no-store",
      },
    },
  );
});
