import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiHandler } from "@/lib/api-errors";
import { equipmentSlots } from "@/lib/albion/equipment-catalog";
export const GET = apiHandler("catalog.search", async (req: NextRequest) => {
  const q = z
    .object({
      search: z.string().max(100).default(""),
      slot: z.enum(equipmentSlots).optional(),
      tier: z.coerce.number().int().min(1).max(8).optional(),
      enchantment: z.coerce.number().int().min(0).max(4).optional(),
      page: z.coerce.number().int().min(1).max(1000).default(1),
    })
    .parse(Object.fromEntries(req.nextUrl.searchParams));
  const where = {
    active: true,
    ...(q.slot ? { slot: q.slot } : {}),
    ...(q.tier ? { tier: q.tier } : {}),
    ...(q.enchantment !== undefined ? { enchantment: q.enchantment } : {}),
    OR: [
      { name: { contains: q.search, mode: "insensitive" as const } },
      { id: { contains: q.search, mode: "insensitive" as const } },
    ],
  };
  const [items, total] = await db.$transaction([
    db.itemMetadata.findMany({
      where,
      orderBy: { id: "asc" },
      skip: (q.page - 1) * 30,
      take: 30,
      select: { id: true, name: true, slot: true, tier: true, enchantment: true, itemPower: true },
    }),
    db.itemMetadata.count({ where }),
  ]);
  return NextResponse.json({ items, total, page: q.page, pageSize: 30 });
});
