import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PreferencesForm, DeleteAccountForm } from "@/components/settings-forms";
import { LogoutButton } from "@/components/login-button";
export default async function Settings({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin");
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/signin");
  const query = await searchParams;
  return (
    <>
      <h1 className="page-title display-title">Account settings</h1>
      <div className="calculator-grid">
        <section className="panel">
          <h2>Profile & preferences</h2>
          {query.saved && <p role="status">Preferences saved.</p>}
          {query.error && (
            <p role="alert" className="error">
              {query.error === "ownership"
                ? "Transfer group ownership or delete owned groups before deleting this account."
                : query.error === "rate"
                  ? "Too many requests. Please try again later."
                  : "Check the entered values and try again."}
            </p>
          )}
          <PreferencesForm
            initial={{
              name: user.name || "Adventurer",
              region: user.region,
              characterName: user.characterName || "",
            }}
          />
        </section>
        <section className="panel">
          <h2>Your data, your choice</h2>
          <p>
            Export the profile data held by Outpost. Account deletion permanently removes your
            account, connected OAuth records and active sessions.
          </p>
          <div className="actions">
            <a className="button secondary" href="/api/account/export">
              Export personal data
            </a>
            <LogoutButton />
          </div>
          <DeleteAccountForm />
        </section>
      </div>
    </>
  );
}
