import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiHandler, HttpError } from "@/lib/api-errors";
import { boundedJson, mutationUser } from "@/lib/http";
import { findLibraryBuilds } from "@/lib/grind-library";
import { savedLibraryBuild } from "@/lib/build-device-collections";
import { accountSavesRequest, LIBRARY_FAVORITE_LIMIT } from "@/lib/account-saves";
import { accountSaves } from "@/lib/account-saves-service";

/** Library entries for these keys, in the order asked; keys no longer in the library drop out. */
async function libraryBuilds(keys: string[]) {
  if (!keys.length) return [];
  const found = new Map(
    (await findLibraryBuilds(keys)).map((build) => {
      const saved = savedLibraryBuild(build);
      return [saved.slug, saved] as const;
    }),
  );
  return keys.flatMap((key) => found.get(key) ?? []);
}

async function answer(saves: { favorites: string[]; levels: Record<string, number> }) {
  const favorites = await libraryBuilds(saves.favorites);
  return {
    favorites,
    // Saved builds since removed from the library, kept on the account but not shown.
    unavailable: saves.favorites.length - favorites.length,
    limit: LIBRARY_FAVORITE_LIMIT,
    levels: saves.levels,
  };
}

/** The signed-in account's library favorites and spec levels; never another account's. */
export const GET = apiHandler("account.saves.read", async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new HttpError(401, "Sign in to see your saves");
  return NextResponse.json(await answer(await accountSaves(session.user.id, { action: "read" })));
});

/**
 * Change the signed-in account's saves: merge a device copy, save or remove one library
 * favorite, or replace the spec levels. Origin, session and the content budget are checked
 * first; favorite keys are resolved against the library before anything is stored.
 */
export const POST = apiHandler("account.saves.write", async (req: NextRequest) => {
  const auth = await mutationUser(req);
  if (auth.error) return auth.error;
  const input = accountSavesRequest.parse(await boundedJson(req, 131072));
  if (input.action === "merge") {
    const known = (await libraryBuilds([...new Set(input.favorites)])).map((b) => b.slug);
    const saves = await accountSaves(auth.userId!, { ...input, favorites: known });
    return NextResponse.json({ ...(await answer(saves)), skipped: saves.skipped ?? 0 });
  }
  if (input.action === "favorite") {
    if (input.active && !(await libraryBuilds([input.slug])).length)
      throw new HttpError(404, "Library build not found");
    const saves = await accountSaves(auth.userId!, input);
    return NextResponse.json({ favorite: saves.favorite, total: saves.favorites.length });
  }
  const saves = await accountSaves(auth.userId!, input);
  return NextResponse.json({ levels: saves.levels });
});
