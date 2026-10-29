import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PreferencesForm, DeleteAccountForm } from "@/components/settings-forms";
import { LogoutButton } from "@/components/login-button";
import Link from "@/components/link";
import { WorkspaceHeading } from "@/components/workspace-heading";
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
    <div className="support-settings">
      <WorkspaceHeading
        title="Account settings"
        description="Manage your profile, preferred server and account data."
        icon="account"
      />
      <div className="account-settings-workspace">
        <nav className="account-settings-navigation" aria-label="Settings sections">
          <a href="#profile-preferences">Profile & preferences</a>
          <a href="#account-data">Export your data</a>
          <a href="#account-session">Current session</a>
          <a href="#account-delete">Close account</a>
          {["ADMIN", "MODERATOR"].includes(user.role) && (
            <Link href="/admin/reports">Moderation dashboard</Link>
          )}
        </nav>
        <div className="account-settings-content">
          <section className="panel" id="profile-preferences">
            <h2>Profile & preferences</h2>
            {query.saved && <p role="status">Preferences saved.</p>}
            {query.error && (
              <p role="alert" className="error">
                {query.error === "ownership"
                  ? "Transfer team ownership or delete owned teams before deleting this account."
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
          <section className="panel settings-data-section" id="account-data">
            <div>
              <h2>Your data, your choice</h2>
              <p>
                Download the profile data and plans held by Outpost. Your export is created for your
                signed-in account.
              </p>
            </div>
            <a className="button secondary" href="/api/account/export">
              Export personal data
            </a>
          </section>
          <section className="panel settings-session-section" id="account-session">
            <div>
              <h2>Current session</h2>
              <p>
                Signed in as <strong>{user.name || "Adventurer"}</strong> through Discord.
              </p>
            </div>
            <LogoutButton />
          </section>
          <section className="panel settings-delete-section" id="account-delete">
            <h2>Close your account</h2>
            <p>
              Account deletion permanently removes your account, connected OAuth records and active
              sessions. Transfer or close teams you own first.
            </p>
            <DeleteAccountForm />
          </section>
        </div>
      </div>
    </div>
  );
}
