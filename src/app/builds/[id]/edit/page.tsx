import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildInput } from "@/lib/builds/validation";
import { BuildEditor } from "@/components/build-editor";
import { WorkspaceHeading } from "@/components/workspace-heading";
export default async function EditBuild({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin");
  const { id } = await params;
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
        title="Edit build"
        description={build.title}
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
