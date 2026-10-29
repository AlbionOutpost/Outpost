import { z } from "zod";
import { regionSchema } from "../albion/region-config";
import { roles } from "./roles";
export const buildCompositionLaunch = z
  .object({
    fromBuild: z
      .string()
      .regex(/^[A-Za-z0-9-]{1,100}$/)
      .optional(),
    fromLibrary: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]{0,199}$/)
      .optional(),
    region: regionSchema.optional(),
    role: z.enum(roles).optional(),
  })
  .strict()
  .refine((value) => !(value.fromBuild && value.fromLibrary), "Choose one build source.");
export type BuildCompositionLaunch = z.infer<typeof buildCompositionLaunch>;
export function compositionLaunchPath(input: BuildCompositionLaunch) {
  const valid = buildCompositionLaunch.parse(input),
    query = new URLSearchParams();
  for (const key of ["fromBuild", "fromLibrary", "region", "role"] as const)
    if (valid[key]) query.set(key, valid[key]!);
  return `/compositions/new${query.size ? `?${query}` : ""}`;
}
