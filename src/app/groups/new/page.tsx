import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { GroupCreate } from "@/components/group-create";
export default async function NewGroup() {
  if (!(await getServerSession(authOptions))) redirect("/signin");
  return (
    <>
      <h1 className="page-title display-title">Create a guild workspace</h1>
      <GroupCreate />
    </>
  );
}
