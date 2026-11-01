import { z } from "zod";
import { regionSchema } from "./albion/region-config";
import { catalogItem } from "./catalog/validation";
export const watchInput = z
  .object({
    region: regionSchema,
    itemId: catalogItem.shape.id,
    quality: z.number().int().min(1).max(5),
  })
  .strict();
export const watchResponse = z
  .array(watchInput.extend({ id: z.string().min(1).max(100) }))
  .max(100);
