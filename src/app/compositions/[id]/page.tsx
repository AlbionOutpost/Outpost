import { CommunityPanel } from "@/components/community-panel";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { requireRead, canEdit, groupRole } from "@/lib/compositions/service";
import { canManageMembers, canEditShared } from "@/lib/groups/permissions";
import { db } from "@/lib/db";
import { compositionInput } from "@/lib/compositions/validation";
import { HttpError } from "@/lib/api-errors";
import { CompositionView } from "@/components/composition-view";
export default async function CompositionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  let row;
  try {
    row = await requireRead(id, userId);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
  const editable = !!userId && (await canEdit(row, userId));
  const role = row.groupId ? await groupRole(db, row.groupId, userId) : null;
  const deletable =
    row.visibility === "GROUP"
      ? (row.authorId === userId && canEditShared(role)) || canManageMembers(role)
      : row.authorId === userId;
  return (
    <>
      <div className="eyebrow">
        {row.contentType} ·{" "}
        {{ PUBLIC: "Public", PRIVATE: "Private", GROUP: "Guild only" }[row.visibility]} · REVISION{" "}
        {row.version}
      </div>
      <h1 className="page-title display-title">{row.title}</h1>
      <p className="intro preserve">{row.description}</p>
      <p className="muted">
        {compositionInput.parse(row).slots.length} players · {row.region} · Updated{" "}
        <time dateTime={row.updatedAt.toISOString()}>
          {row.updatedAt.toLocaleString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "UTC",
          })}{" "}
          UTC
        </time>
      </p>
      <CompositionView
        id={id}
        composition={compositionInput.parse(row)}
        editable={editable}
        deletable={deletable}
      />
      <CommunityPanel kind="composition" id={id} />
    </>
  );
}
