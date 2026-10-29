import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "@/components/link";
import { authOptions } from "@/lib/auth";
import { editorOptions } from "@/lib/compositions/repository";
import { CompositionEditor } from "@/components/composition-editor";
import { buildCompositionLaunch, compositionLaunchPath } from "@/lib/compositions/build-launch";
import { resolveCompositionSource } from "@/lib/compositions/build-loadout-source";
import { compositionFromLoadout } from "@/lib/compositions/build-loadout";
import { regionSchema } from "@/lib/albion/region-config";
import { HttpError } from "@/lib/http-error";
import { db } from "@/lib/db";
import { findLibraryComposition, findLibraryBuilds, librarySpellNames } from "@/lib/grind-library";
import { copyLibraryGroup } from "@/lib/compositions/library-group";
export const dynamic = "force-dynamic";
export default async function NewComposition({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams,
    parsed = buildCompositionLaunch.safeParse(params),
    session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    const callbackUrl = parsed.success ? compositionLaunchPath(parsed.data) : "/compositions/new";
    redirect(`/signin?${new URLSearchParams({ callbackUrl })}`);
  }
  let initial: ReturnType<typeof compositionFromLoadout>["initial"] | undefined,
    notice = "",
    error = "";
  const recoveryRegion = regionSchema.safeParse(params.region);
  const recoveryQuery = recoveryRegion.success ? `?region=${recoveryRegion.data}` : "";
  if (!parsed.success) error = "Choose one valid build source, server and optional role.";
  else {
    const requestedRegion = parsed.data.region || (await cookies()).get("atlas-region")?.value;
    const region = regionSchema
      .catch("europe")
      .parse(
        requestedRegion ||
          (await db.user.findUnique({ where: { id: session.user.id }, select: { region: true } }))
            ?.region,
      );
    try {
      if (parsed.data.fromComposition) {
        const composition = await findLibraryComposition(parsed.data.fromComposition);
        if (!composition) throw new HttpError(404, "Group build not found");
        try {
          const copied = copyLibraryGroup(
            composition,
            await findLibraryBuilds([...new Set(composition.members)]),
            await librarySpellNames(),
            region,
          );
          initial = copied.initial;
          notice = copied.notice;
        } catch (e) {
          throw new HttpError(
            422,
            e instanceof Error ? e.message : "This group build cannot be copied safely.",
          );
        }
      } else {
        const source = await resolveCompositionSource(parsed.data, session.user.id);
        if (source) {
          const copied = compositionFromLoadout(source, region, parsed.data.role);
          initial = copied.initial;
          notice = copied.notice;
        } else
          initial = {
            title: "",
            description: "",
            region,
            contentType: "ZvZ",
            visibility: "PRIVATE",
            groupId: null,
            notes: "",
            slots: [],
          };
      }
    } catch (e) {
      if (e instanceof HttpError && [400, 404, 422].includes(e.status)) error = e.message;
      else throw e;
    }
  }
  return (
    <div className="composition-editor-page">
      <h1 className="page-title display-title">Create a comp</h1>
      {error ? (
        <section className="panel" role="alert">
          <h2>This loadout cannot be added</h2>
          <p>{error}</p>
          <Link href={`/builds/library${recoveryQuery}`} className="button secondary">
            Browse builds
          </Link>
          <Link href={`/compositions/new${recoveryQuery}`} className="text-link">
            Start an empty composition
          </Link>
        </section>
      ) : (
        <CompositionEditor
          {...await editorOptions(session.user.id)}
          initial={initial}
          initialNotice={notice}
        />
      )}
    </div>
  );
}
