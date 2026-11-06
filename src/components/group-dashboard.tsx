"use client";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarPlus, Plus, UserPlus } from "lucide-react";
import Link from "@/components/link";
import type { GroupDashboardData } from "@/lib/groups/dashboard";
import { canEditShared, canManageMembers } from "@/lib/groups/permissions";
import { WorkspaceHeading } from "./workspace-heading";
import { TeamChips, TeamMark, TeamNextSteps, roleLabel } from "./group-parts";
import { GroupOverview } from "./group-overview";
import { GroupEvents, GroupEventDialog } from "./group-events";
import { GroupMembers } from "./group-members";
import { GroupComps, GroupBuilds } from "./group-shared";
import { GroupAnnouncements } from "./group-announcements";
import { GroupSettings } from "./group-settings";
import { TeamLootWorkspace, newLootSplitEvent } from "./team-loot-workspace";
import styles from "./teams.module.css";

export type TeamTab =
  | "Overview"
  | "Events"
  | "Members"
  | "Comps"
  | "Builds"
  | "Loot splits"
  | "Announcements"
  | "Settings";
const tabs: TeamTab[] = [
  "Overview",
  "Events",
  "Members",
  "Comps",
  "Builds",
  "Loot splits",
  "Announcements",
  "Settings",
];
const tabHash = (name: string) => `#team-${name.toLowerCase().replaceAll(" ", "-")}`;
const tabId = (name: string) => `guild-tab-${name.replaceAll(" ", "-")}`;

function subscribeTeamHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
  };
}
const teamHash = () => window.location.hash;

/** What every tab of the workspace gets: the data, the viewer's rights and the one way to save. */
export type TeamContext = {
  groupId: string;
  userId: string;
  role: string;
  data: GroupDashboardData;
  editor: boolean;
  manager: boolean;
  busy: boolean;
  /** The time the page was rendered on the server, so upcoming/past splits match on hydration. */
  now: number;
  run: (action: Record<string, unknown>) => Promise<boolean>;
  setTab: (tab: TeamTab) => void;
  newEvent: () => void;
};

/**
 * A member's Team workspace: the team's masthead with its tabs, then one tab's panels. Every
 * change goes through `/api/groups/[id]/actions`, which re-checks membership and role; the
 * buttons shown here only follow the role the server reported.
 */
export function GroupDashboard({
  groupId,
  role,
  userId,
  data,
  group,
  now,
  gate,
  profile,
}: {
  groupId: string;
  role: string;
  userId: string;
  data: GroupDashboardData;
  group: { name: string; description: string; region: string; visibility: string };
  now: number;
  /** The Supporter notice when the owner's plan has lapsed. */
  gate?: ReactNode;
  profile?: ReactNode;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [eventFilter, setEventFilter] = useState("upcoming");
  const hash = useSyncExternalStore(subscribeTeamHash, teamHash, () => "");
  const tab = tabs.find((name) => tabHash(name) === hash) || "Overview";
  // On phones the tab row scrolls; keep the open tab in view
  useEffect(() => {
    document.getElementById(tabId(tab))?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [tab]);
  function setTab(name: TeamTab) {
    const target = tabHash(name);
    if (window.location.hash === target) return;
    window.history.pushState(null, "", target);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
  // While the owner's plan has lapsed the server refuses shared edits; hide their controls too.
  const editor = canEditShared(role) && !gate,
    manager = canManageMembers(role);
  async function run(action: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/groups/${groupId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      if (body.path) setInviteLink(new URL(body.path, window.location.origin).href);
      if (body.left || body.deleted) {
        router.push("/groups");
        router.refresh();
      } else {
        if (action.action === "cancel-event") setEventFilter("all");
        if (action.action === "event") {
          setEventOpen(false);
          setEventFilter("upcoming");
          setTab("Events");
        }
        setMessage("Change saved.");
        router.refresh();
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save change");
      return false;
    } finally {
      setBusy(false);
    }
  }
  const ctx: TeamContext = {
    groupId,
    userId,
    role,
    data,
    editor,
    manager,
    busy,
    now,
    run,
    setTab,
    newEvent: () => setEventOpen(true),
  };
  // One primary action, the one that fits the open tab
  const primary = !editor ? undefined : tab === "Overview" || tab === "Events" ? (
    <button type="button" className="button primary" onClick={() => setEventOpen(true)}>
      <CalendarPlus size={17} aria-hidden="true" /> New event
    </button>
  ) : tab === "Loot splits" ? (
    <button
      type="button"
      className="button primary"
      onClick={() => window.dispatchEvent(new Event(newLootSplitEvent))}
    >
      <Plus size={17} aria-hidden="true" /> New split
    </button>
  ) : tab === "Members" ? (
    <button
      type="button"
      className="button primary"
      onClick={() => {
        setTab("Settings");
        requestAnimationFrame(() =>
          document.getElementById("team-invites")?.scrollIntoView({ block: "center" }),
        );
      }}
    >
      <UserPlus size={17} aria-hidden="true" /> Invite
    </button>
  ) : undefined;
  return (
    <>
      <WorkspaceHeading
        scene="comps"
        emblem={<TeamMark name={group.name} />}
        // A player-named title: no ember accent word on someone else's words
        title={group.name}
        description={group.description || "A Team workspace on Outpost."}
        actions={primary}
      >
        <TeamChips region={group.region} visibility={group.visibility} members={data.memberCount}>
          <span className="landing-chip is-muted">Your role: {roleLabel(role)}</span>
        </TeamChips>
        <div className={styles.tabRow}>
          <Link className={styles.backTab} href="/groups">
            <ArrowLeft size={14} aria-hidden="true" /> All teams
          </Link>
          <nav className={styles.tabs} role="tablist" aria-label="Team workspace">
            {tabs.map((name, i) => (
              <button
                type="button"
                role="tab"
                id={tabId(name)}
                aria-controls="guild-tab-panel"
                aria-selected={tab === name}
                tabIndex={tab === name ? 0 : -1}
                key={name}
                onClick={() => setTab(name)}
                onKeyDown={(e) => {
                  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                  e.preventDefault();
                  const next =
                    tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
                  setTab(next);
                  document.getElementById(tabId(next))?.focus();
                }}
              >
                {name}
              </button>
            ))}
          </nav>
        </div>
      </WorkspaceHeading>
      {gate}
      {error && (
        <p role="alert" className={styles.alert}>
          {error}
        </p>
      )}
      <p role="status" className={message ? styles.saved : "sr-only"}>
        {message}
      </p>
      <div id="guild-tab-panel" role="tabpanel" aria-labelledby={tabId(tab)}>
        {/* Kept mounted so an unsaved split survives switching tabs */}
        <div hidden={tab !== "Loot splits"}>
          <TeamLootWorkspace
            groupId={groupId}
            userId={userId}
            members={data.members}
            editable={editor}
            active={tab === "Loot splits"}
          />
        </div>
        {tab === "Overview" && <GroupOverview ctx={ctx} />}
        {tab === "Events" && (
          <GroupEvents ctx={ctx} filter={eventFilter} onFilter={setEventFilter} />
        )}
        {tab === "Members" && <GroupMembers ctx={ctx} />}
        {tab === "Comps" && <GroupComps ctx={ctx} />}
        {tab === "Builds" && <GroupBuilds ctx={ctx} />}
        {tab === "Announcements" && <GroupAnnouncements ctx={ctx} />}
        {tab === "Settings" && (
          <GroupSettings ctx={ctx} inviteLink={inviteLink} profile={profile} />
        )}
      </div>
      <TeamNextSteps />
      {editor && (
        <GroupEventDialog ctx={ctx} open={eventOpen} onClose={() => setEventOpen(false)} />
      )}
    </>
  );
}

/** A public team seen by someone outside it: ask the owner and admins to let you in. */
export function GroupRequest({ groupId }: { groupId: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className={styles.requestForm}
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        try {
          const response = await fetch(`/api/groups/${groupId}/actions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "request", message: f.get("message") }),
          });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error);
          setMessage("Membership request saved. An owner or admin must approve it.");
        } catch (e) {
          setMessage(e instanceof Error ? e.message : "Could not submit request");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        <span>Message to team leaders</span>
        <textarea
          name="message"
          maxLength={1000}
          placeholder="Your character, your role and when you usually play."
        />
      </label>
      <div className={styles.formActions}>
        <button className="button primary" disabled={busy}>
          Request membership
        </button>
      </div>
      <p role="status" className={message ? styles.saved : "sr-only"}>
        {message}
      </p>
    </form>
  );
}
