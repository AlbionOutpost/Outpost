import { privateMetadata } from "@/lib/seo";
import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { requireRead, canEdit } from "@/lib/compositions/service";
import { editorOptions } from "@/lib/compositions/repository";
import { readStoredComposition } from "@/lib/compositions/stored";
import Link from "@/components/build-region-link";
import { ArrowLeft } from "lucide-react";
import { CompNextSteps } from "@/components/comp-next-steps";
import styles from "@/components/comps.module.css";
import { HttpError } from "@/lib/api-errors";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { CompositionEditor } from "@/components/composition-editor";
export const metadata = privateMetadata("Edit comp");
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
  const { composition, dropped } = readStoredComposition(row);
  return (
    <div className={styles.workspace}>
      <WorkspaceHeading
        glyph="composition"
        scene="comps"
        title="Edit comp"
        accent="comp"
        description="Change roles, loadouts and notes. Saving keeps a new revision."
      >
        <Link className="pill-link is-small masthead-back" href="/compositions">
          <ArrowLeft size={14} aria-hidden="true" /> Back to comps
        </Link>
      </WorkspaceHeading>
      <CompositionEditor
        key={`${session.user.id}:${id}`}
        ownerId={session.user.id}
        recoveryKey={`composition:${id}`}
        id={id}
        version={row.version}
        initial={composition}
        initialNotice={
          dropped
            ? `${dropped === 1 ? "One member" : `${dropped} members`} of this comp could not be read and ${dropped === 1 ? "was" : "were"} left out. Saving a new revision removes ${dropped === 1 ? "it" : "them"}.`
            : undefined
        }
        {...await editorOptions(session.user.id)}
      />
      <CompNextSteps
        show={["builds", "library", "teams"]}
        title={
          <>
            Missing a <em>build</em>?
          </>
        }
        line="Find a loadout for an open slot, borrow from a recorded comp, or share the plan with your Team."
      />
    </div>
  );
}
