import { isSupporter } from "@/lib/billing/plan";
import { giftedSupporter } from "@/lib/admin/policy";
import { privateMetadata } from "@/lib/seo";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Download, ShieldCheck } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PreferencesForm, DeleteAccountForm } from "@/components/settings-forms";
import { LogoutButton } from "@/components/login-button";
import Link from "@/components/link";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { AccountEmblem } from "@/components/account-emblem";
import { PanelHead } from "@/components/panel-head";
import { NextStepCards } from "@/components/next-step-cards";
import { regionLabel } from "@/components/group-parts";
import styles from "@/components/account.module.css";
export const metadata = privateMetadata("Settings");

const date = (d: Date) =>
  d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

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
  const supporter = isSupporter(user);
  const plan = supporter
    ? giftedSupporter(user)
      ? `Supporter gift${user.supporterGiftUntil && !user.supporterGiftPermanent ? ` until ${date(user.supporterGiftUntil)}` : ", no end date"}`
      : `Supporter${user.planRenewsAt ? ` · renews ${date(user.planRenewsAt)}` : ""}`
    : "Free";
  const sections = [
    ["profile-preferences", "Profile & preferences"],
    ["account-billing", "Supporter plan"],
    ["account-data", "Export your data"],
    ["account-session", "Current session"],
    ["account-delete", "Close account"],
  ] as const;
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        scene="guides"
        title="Account settings"
        accent="settings"
        description="Your name, your server and the data Outpost keeps for you."
        icon="account"
        emblem={<AccountEmblem image={user.image} />}
        actions={
          ["ADMIN", "MODERATOR"].includes(user.role) ? (
            <Link
              className="button secondary"
              href={user.role === "ADMIN" ? "/admin" : "/admin/reports"}
            >
              <ShieldCheck size={16} aria-hidden="true" />
              {user.role === "ADMIN" ? "Admin dashboard" : "Moderation dashboard"}
            </Link>
          ) : undefined
        }
      >
        <div className={`landing-chips ${styles.chips}`}>
          <span className={supporter ? "landing-chip" : "landing-chip is-muted"}>{plan}</span>
          <span className="landing-chip is-muted">{regionLabel(user.region)}</span>
          <span className="landing-chip is-muted">Signed in with Discord</span>
        </div>
      </WorkspaceHeading>
      <div className={styles.settings}>
        <nav className={`raised ${styles.rail}`} aria-label="Settings sections">
          {sections.map(([id, label]) => (
            <a key={id} href={`#${id}`} data-danger={id === "account-delete" ? "" : undefined}>
              {label}
            </a>
          ))}
        </nav>
        <div className={styles.settingsBody}>
          <section
            className={`panel ${styles.panel}`}
            id="profile-preferences"
            aria-labelledby="pref-title"
          >
            <PanelHead id="pref-title" title="Profile & preferences" />
            {query.saved && (
              <p role="status" className={styles.saved}>
                Preferences saved.
              </p>
            )}
            {query.error && (
              <p role="alert" className={styles.alert}>
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
          <section
            className={`panel ${styles.panel}`}
            id="account-billing"
            aria-labelledby="plan-title"
          >
            <PanelHead
              id="plan-title"
              emblem="team-roles"
              title="Supporter plan"
              line={
                supporter
                  ? `${plan}${user.planStatus === "past_due" ? " · last payment failed" : ""}. No advertising and your own Team workspace.`
                  : "Free. Supporters see no advertising and can run a Team workspace."
              }
              actions={
                <Link className="button secondary" href="/supporter">
                  {supporter ? "View Supporter benefits" : "See the Supporter plan"}
                </Link>
              }
            />
          </section>
          <section
            className={`panel ${styles.panel}`}
            id="account-data"
            aria-labelledby="data-title"
          >
            <PanelHead
              id="data-title"
              title="Export your data"
              line="One JSON file with your profile, builds, comps, timers and saved plans."
              actions={
                <a className="button secondary" href="/api/account/export">
                  <Download size={16} aria-hidden="true" /> Export personal data
                </a>
              }
            />
          </section>
          <section
            className={`panel ${styles.panel}`}
            id="account-session"
            aria-labelledby="session-title"
          >
            <PanelHead
              id="session-title"
              title="Current session"
              line={`Signed in as ${user.name || "Adventurer"} through Discord on this browser.`}
              actions={<LogoutButton />}
            />
          </section>
          <section
            className={`panel ${styles.panel} ${styles.danger}`}
            id="account-delete"
            aria-labelledby="delete-title"
          >
            <PanelHead
              id="delete-title"
              title="Close your account"
              line="Deletes your account, its sign-in records and sessions for good."
            />
            <ul className={styles.checklist}>
              <li>Hand over or delete the teams you own first.</li>
              <li>Cancel a Supporter subscription and let it end before you delete.</li>
              <li>We check billing before deleting and close any open checkout links.</li>
            </ul>
            <DeleteAccountForm />
          </section>
        </div>
      </div>
      <NextStepCards
        id="settings-next"
        title={
          <>
            Back to your <em>plans</em>
          </>
        }
        line="Everything you saved, one click away."
        cards={[
          {
            href: "/dashboard",
            emblem: "strip-builds",
            title: "Dashboard",
            line: "Recent builds, comps, timers and teams.",
            scene: "build",
          },
          {
            href: "/timers",
            emblem: "team-calendar",
            title: "Timers",
            line: "Crops, laborers and reminders.",
            scene: "economy",
          },
          {
            href: "/favorites",
            emblem: "strip-comps",
            title: "Favorites",
            line: "Builds and comps you saved.",
            scene: "composition",
          },
        ]}
      />
    </div>
  );
}
