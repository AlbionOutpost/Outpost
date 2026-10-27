import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildInput } from "@/lib/builds/validation";
import { BuildEditor } from "@/components/build-editor";
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
      <h1 className="page-title display-title">Edit build</h1>
      <BuildEditor initial={buildInput.parse(build)} id={build.id} version={build.version} />
    </div>
  );
}
