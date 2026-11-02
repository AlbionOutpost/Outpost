import { z } from "zod";
import { Prisma } from "@/lib/prisma-runtime";
import { db, databaseService } from "./db";
import { HttpError } from "./http-error";
export const libraryLikeTarget = z.object({
  kind: z.enum(["build", "composition"]),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});
async function localSetLibraryLike(kind: string, slug: string, userId: string, active: boolean) {
  const target = libraryLikeTarget.parse({ kind, slug });
  z.boolean().parse(active);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(
        async (tx) => {
          if (!(await tx.user.findUnique({ where: { id: userId }, select: { id: true } })))
            throw new HttpError(401, "Sign in required");
          const identity = { userId, ...target };
          if (active)
            await tx.libraryLike.upsert({
              where: { userId_kind_slug: identity },
              create: identity,
              update: {},
            });
          else await tx.libraryLike.deleteMany({ where: identity });
          return { liked: active, outpostCount: await tx.libraryLike.count({ where: target }) };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        attempt === 2 ||
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        !["P2002", "P2034"].includes(error.code)
      )
        throw error;
    }
  }
  throw new HttpError(409, "Please retry your like.");
}
export const setLibraryLike: typeof localSetLibraryLike = (...args) =>
  databaseService<Awaited<ReturnType<typeof localSetLibraryLike>>>("setLibraryLike", args) ??
  localSetLibraryLike(...args);
