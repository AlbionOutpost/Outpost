import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { editorOptions } from "@/lib/compositions/repository";
import { CompositionEditor } from "@/components/composition-editor";
export default async function NewComposition() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin");
  return (
    <div className="composition-editor-page">
      <h1 className="page-title display-title">Create a comp</h1>
      <CompositionEditor {...await editorOptions(session.user.id)} />
    </div>
  );
}
