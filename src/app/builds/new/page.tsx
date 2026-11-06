import { privateMetadata } from "@/lib/seo";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { BuildEditor } from "@/components/build-editor";
import { findLibraryBuild, libraryBuildDraft } from "@/lib/grind-library";
import Link from "@/components/link";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { regionSchema } from "@/lib/albion/region-config";
// Editors are not search results; keep crawlers from spending the request budget here.
export const metadata = privateMetadata("Create a build");
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
      <WorkspaceHeading
        glyph="builds"
        scene="builds"
        title="Create a build"
        accent="build"
        description={
          source
            ? `A copy of ${source.title} by ${source.author}. Change any piece, then save it as your own.`
            : "Pick each piece on the board, choose its abilities, then save the loadout or share it."
        }
      >
        <div className="editor-backline">
          <Link className="pill-link is-small" href="/builds">
            <ArrowLeft size={14} aria-hidden="true" /> Builds
          </Link>
          {source && (
            <Link
              className="pill-link is-small"
              href={`/builds/library/${encodeURIComponent(source.slug)}`}
            >
              Original build
            </Link>
          )}
        </div>
      </WorkspaceHeading>
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
