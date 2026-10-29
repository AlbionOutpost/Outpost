import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BuildEditor } from "@/components/build-editor";
import { findLibraryBuild, libraryBuildDraft } from "@/lib/grind-library";
import Link from "@/components/link";
import { regionSchema } from "@/lib/albion/region-config";
export default async function NewBuild({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; region?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { from, region } = await searchParams;
  const source = typeof from === "string" ? await findLibraryBuild(from) : undefined;
  const initial = source ? await libraryBuildDraft(source) : null;
  if (initial && region) initial.region = regionSchema.catch("europe").parse(region);
  return (
    <div className="build-editor-page">
      <h1 className="page-title display-title">Create a build</h1>
      {source && (
        <p className="library-provenance">
          Adapted from{" "}
          <Link className="text-link" href={`/builds/library/${encodeURIComponent(source.slug)}`}>
            {source.title}
          </Link>{" "}
          · {source.author}
        </p>
      )}
      <BuildEditor
        key={`${session?.user?.id || "guest"}:${source?.slug || "blank"}:${initial?.region || "preferred"}`}
        initial={initial || undefined}
        guest={!session?.user?.id}
        ownerId={session?.user?.id}
        recoveryKey={`new:${source?.slug || "blank"}:${initial?.region || "preferred"}`}
      />
    </div>
  );
}
