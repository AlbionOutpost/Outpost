import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-errors";
import {
  catalogQuery,
  catalogVariants,
  searchCatalog,
  searchCatalogGrouped,
} from "@/lib/catalog/item-search";
const modes = z.object({
  group: z.enum(["base"]).optional(),
  variants: z
    .string()
    .regex(/^T[1-8]_[A-Z0-9_]+(?:@[1-4])?$/)
    .max(100)
    .optional(),
});
export const GET = apiHandler("catalog.search", async (req: NextRequest) => {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const { group, variants } = modes.parse(params);
  if (variants) return NextResponse.json({ items: await catalogVariants(variants) });
  const q = catalogQuery.parse(params);
  return NextResponse.json(await (group ? searchCatalogGrouped(q) : searchCatalog(q)));
});
