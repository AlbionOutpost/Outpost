import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { BuildEditor } from "@/components/build-editor";
export default async function NewBuild() {
  if (!(await getServerSession(authOptions))) redirect("/signin");
  return (
    <div className="build-editor-page">
      <h1 className="page-title display-title">Create a build</h1>
      <BuildEditor />
    </div>
  );
}
