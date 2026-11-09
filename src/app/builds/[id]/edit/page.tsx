import { privateMetadata } from "@/lib/seo";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildInput } from "@/lib/builds/validation";
import { BuildEditor } from "@/components/build-editor";
import Link from "@/components/link";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { signInPath } from "@/lib/sign-in-return";
export const metadata = privateMetadata("Edit build");
export default async function EditBuild({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;
  if (!session?.user?.id) redirect(signInPath(`/builds/${id}/edit`));
  const build = await db.build.findFirst({
    where: { id, authorId: session.user.id },
    include: { equipment: true },
  });
  if (!build) notFound();
  return (
    <div className="build-editor-page">
      <WorkspaceHeading
        glyph="builds"
        scene="builds"
        title="Edit your build"
        accent="build"
        description={`${build.title}. Each save adds a revision, so you can always go back.`}
        actions={
          <div className="editor-backline">
            <Link className="pill-link is-small" href="/builds">
              <ArrowLeft size={14} aria-hidden="true" /> Builds
            </Link>
            <Link className="pill-link is-small" href={`/builds/${build.id}`}>
              View build
            </Link>
          </div>
        }
      />
      <BuildEditor
        key={`${session.user.id}:${build.id}`}
        initial={buildInput.parse(build)}
        id={build.id}
        version={build.version}
        ownerId={session.user.id}
        recoveryKey={`build:${build.id}`}
      />
    </div>
  );
}
