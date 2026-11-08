import { privateMetadata } from "@/lib/seo";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowRight, Download } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveAvatarFrame } from "@/lib/avatar-frames";
import { isSupporter, supporterLabel, supporterSource } from "@/lib/billing/plan";
import { PreferencesForm, DeleteAccountForm } from "@/components/settings-forms";
import { LogoutButton } from "@/components/login-button";
import Link from "@/components/link";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { AvatarFrame } from "@/components/avatar-frame";
import account from "@/components/account.module.css";
import styles from "./settings.module.css";
import { signInPath } from "@/lib/sign-in-return";
import { displayName } from "@/lib/display-name";
export const metadata = privateMetadata("Settings");

/** One settings group: its name and a line on the left, the controls in a panel on the right. */
function Group({
  id,
  title,
  line,
  danger,
  children,
}: {
  id: string;
  title: string;
  line: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={styles.group} aria-labelledby={id} data-danger={danger || undefined}>
      <div className={styles.groupHead}>
        <h2 id={id}>{title}</h2>
        <p>{line}</p>
      </div>
      <div className={`panel ${styles.groupBody}`}>{children}</div>
    </section>
  );
}

/** One line of a settings panel: what it is on the left, its one control on the right. */
function Line({ title, line, action }: { title: string; line: string; action: ReactNode }) {
  return (
    <div className={styles.line}>
      <div>
        <strong>{title}</strong>
        <p>{line}</p>
      </div>
      {action}
    </div>
  );
}

export default async function Settings({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(signInPath("/settings"));
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect(signInPath("/settings"));
  const query = await searchParams;
  const name = displayName(user.name);
  const staff = ["ADMIN", "MODERATOR"].includes(user.role);
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        scene="guides"
        title="Account settings"
        accent="settings"
        description="Your name, your server and the data Outpost keeps for you."
        icon="account"
        emblem={<AvatarFrame frame={user.avatarFrame} size={96} image={user.image} name={name} />}
      />
      <div className={styles.groups}>
        <Group
          id="pref-title"
          title="Profile & preferences"
          line="How you appear to other players and which server tools open on."
        >
          {query.saved && (
            <p role="status" className={account.saved}>
              Preferences saved.
            </p>
          )}
          {query.error && (
            <p role="alert" className={account.alert}>
              {query.error === "ownership"
                ? "Transfer team ownership or delete owned teams before deleting this account."
                : query.error === "rate"
                  ? "Too many requests. Please try again later."
                  : "Check the entered values and try again."}
            </p>
          )}
          <PreferencesForm
            initial={{
              // The stored name, untouched, so saving other settings never renames anyone.
              name: user.name || "Adventurer",
              region: user.region,
              characterName: user.characterName || "",
              avatarFrame: resolveAvatarFrame(user.avatarFrame) ?? "none",
            }}
            image={user.image}
          />
        </Group>
        <Group
          id="account-title"
          title="Sign-in & data"
          line="Outpost signs you in with Discord and keeps no password."
        >
          <Line
            title="This browser"
            line={`Signed in as ${name} through Discord.`}
            action={<LogoutButton />}
          />
          {isSupporter(user) && (
            <Line
              title={supporterLabel(user)}
              line={
                supporterSource(user) === "launch"
                  ? "A launch grant: every account is a lifetime Supporter, free. There is nothing to pay or renew."
                  : "Your account holds every Supporter benefit."
              }
              action={
                <Link className="button secondary" href="/supporter">
                  About Supporter
                </Link>
              }
            />
          )}
          <Line
            title="Export your data"
            line="One JSON file with your profile, builds, comps, timers and saved plans."
            action={
              <a className="button secondary" href="/api/account/export">
                <Download size={16} aria-hidden="true" /> Export data
              </a>
            }
          />
        </Group>
        {staff && (
          <Group
            id="staff-title"
            title="Staff tools"
            line={`Your account is ${user.role === "ADMIN" ? "an administrator" : "a moderator"}.`}
          >
            <Line
              title={user.role === "ADMIN" ? "Admin console" : "Community reports"}
              line={
                user.role === "ADMIN"
                  ? "Reports, flagged accounts, access changes and the audit trail."
                  : "Review what players reported and resolve it with a reason."
              }
              action={
                <Link
                  className="pill-link"
                  href={user.role === "ADMIN" ? "/admin" : "/admin/reports"}
                >
                  Open <ArrowRight size={15} aria-hidden="true" />
                </Link>
              }
            />
          </Group>
        )}
        <Group
          id="delete-title"
          title="Close your account"
          line="Deletes your account, its sign-in records and sessions for good. Hand over or delete the Teams you own first."
          danger
        >
          <DeleteAccountForm />
        </Group>
      </div>
    </div>
  );
}
