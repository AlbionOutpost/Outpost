import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { equipmentChoice } from "@/lib/compositions/validation";
export const GET = apiHandler("composition.loadout", async (req: NextRequest) => {
  const user = await getServerSession(authOptions);
  if (!user?.user?.id) throw new HttpError(401, "Sign in to attach a build");
  const id = req.nextUrl.searchParams.get("id");
  if (!id || id.length > 100) throw new HttpError(400, "Select a build");
  const build = await db.build.findUnique({ where: { id }, include: { equipment: true } });
  if (
    !build ||
    ((build.visibility === "PRIVATE" || build.hiddenAt) && build.authorId !== user.user.id)
  )
    throw new HttpError(404, "Build not found");
  const loadout = build.equipment.map((e) =>
    equipmentChoice.safeParse({
      slot: e.slot,
      itemId: e.itemId,
      quality: e.quality,
      abilities: e.abilitySelections,
      alternatives: e.alternativeItemIds,
    }),
  );
  if (loadout.some((e) => !e.success))
    throw new HttpError(
      422,
      "This build contains equipment not yet supported by the verified composition catalog. Select equipment directly instead.",
    );
  return NextResponse.json({
    sourceBuildId: build.id,
    equipment: loadout.map((e) => e.data),
    notes: build.equipment
      .filter((e) => e.abilities || e.alternatives)
      .map((e) => `${e.slot} author notes: ${e.abilities} ${e.alternatives}`)
      .join("\n"),
  });
});
