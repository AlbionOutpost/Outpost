import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { requireRead, canEdit } from "@/lib/compositions/service";
import { editorOptions } from "@/lib/compositions/repository";
import { compositionInput } from "@/lib/compositions/validation";
import { HttpError } from "@/lib/api-errors";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { CompositionEditor } from "@/components/composition-editor";
export default async function EditComposition({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin");
  const { id } = await params;
  let row;
  try {
    row = await requireRead(id, session.user.id);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
  if (!(await canEdit(row, session.user.id))) notFound();
  return (
    <div className="composition-editor-page">
      <WorkspaceHeading
        glyph="composition"
        scene="comps"
        title="Edit comp"
        description="Change roles, loadouts and notes; save to keep a new revision."
      />
      <CompositionEditor
        key={`${session.user.id}:${id}`}
        ownerId={session.user.id}
        recoveryKey={`composition:${id}`}
        id={id}
        version={row.version}
        initial={compositionInput.parse(row)}
        {...await editorOptions(session.user.id)}
      />
    </div>
  );
}
