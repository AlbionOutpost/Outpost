import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-errors";
import { itemName, itemValue, itemWeight } from "@/lib/albion/game/server-recipes";
const itemId = z.string().regex(/^[A-Z0-9_]{3,80}(@[1-4])?$/);
/** Static game facts for up to 50 items: English name, weight (kg) and base item value. */
export const GET = apiHandler("items.game", async (req: NextRequest) => {
  const ids = z
    .array(itemId)
    .min(1)
    .max(50)
    .parse((req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean));
  return NextResponse.json({
    items: Object.fromEntries(
      [...new Set(ids)].map((id) => [
        id,
        { name: itemName(id), weight: itemWeight(id), value: itemValue(id) },
      ]),
    ),
  });
});
