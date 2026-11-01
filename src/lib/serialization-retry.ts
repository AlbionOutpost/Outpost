import { Prisma } from "@/lib/prisma-runtime";
/** Retry only transactions Prisma confirms were rolled back for serialization/deadlock.
 * The operation must contain database-only transactional work, with no external side effects.
 */
export async function retrySerialization<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2034" ||
        attempt >= 2
      )
        throw error;
      await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
    }
  }
}
