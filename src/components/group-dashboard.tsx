"use client";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarPlus, Plus, UserPlus } from "lucide-react";
import Link from "@/components/link";
import type { GroupDashboardData } from "@/lib/groups/dashboard";
import type { TeamPermission } from "@/lib/groups/permissions";
import { WorkspaceHeading } from "./workspace-heading";
import { decodeActivities } from "@/lib/groups/crest";
import { TeamActivities, TeamChips, TeamMark, topRoleName } from "./group-parts";
import { LivelyCrest } from "./team-crest";
import { GroupOverview } from "./group-overview";
import { GroupEvents, GroupEventDialog } from "./group-events";
import { GroupMembers } from "./group-members";
import { GroupComps, GroupBuilds } from "./group-shared";
import { GroupAnnouncements } from "./group-announcements";
import { TeamGiveaways } from "./team-giveaways";
import { GroupSettings } from "./group-settings";
import { newLootSplitEvent } from "./team-loot-workspace";
import { TeamTreasury, treasuryViewOf, treasuryViews, type TreasuryView } from "./team-treasury";
import styles from "./teams.module.css";

export type TeamTab =
  | "Overview"
  | "Events"
  | "Members"
  | "Comps"
  | "Builds"
  | "Treasury"
  | "Announcements"
  | "Settings";
const tabs: TeamTab[] = [
  "Overview",
  "Events",
  "Members",
  "Comps",
  "Builds",
  "Treasury",
  "Announcements",
  "Settings",
];
const tabHash = (name: string) => `#team-${name.toLowerCase()}`;
const tabId = (name: string) => `guild-tab-${name}`;
/** The tab (and Treasury view) a hash opens; old Loot, Wallet and Rolls links open the Treasury. */
function routeOf(hash: string): { tab: TeamTab; view: TreasuryView } {
  const view = treasuryViewOf(hash);
  if (view) return { tab: "Treasury", view };
  return { tab: tabs.find((name) => tabHash(name) === hash) || "Overview", view: "loot" };
}

function subscribeTeamHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
  };
}
const teamHash = () => window.location.hash;

/** The viewer's rights as the server resolved them for this render. */
export type TeamViewerAccess = { owner: boolean; rank: number; permissions: string[] };
/** What every tab of the workspace gets: the data, the viewer's rights and the one way to save. */
export type TeamContext = {
  groupId: string;
  userId: string;
  access: TeamViewerAccess;
  /** Whether the viewer holds a permission (shared edits are off while the plan has lapsed). */
  can: (key: TeamPermission) => boolean;
  data: GroupDashboardData;
  busy: boolean;
  /** The time the page was rendered on the server, so upcoming/past splits match on hydration. */
  now: number;
  run: (action: Record<string, unknown>) => Promise<boolean>;
  setTab: (tab: TeamTab) => void;
  newEvent: () => void;
};

/**
 * A member's Team workspace: the team's masthead with its tabs, then one tab's panels. Every
 * change goes through `/api/groups/[id]/actions`, which re-checks membership and permissions
 * against current rows; the buttons shown here only follow the rights the server reported.
 */
export function GroupDashboard({
  groupId,
  access,
  userId,
  data,
  group,
  now,
  gate,
  profile,
}: {
  groupId: string;
  access: TeamViewerAccess;
  userId: string;
  data: GroupDashboardData;
  group: {
    name: string;
    description: string;
    region: string;
    visibility: string;
    crestItem: string | null;
    crestColor: string | null;
    activities: string;
    recruiting: boolean;
  };
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
  const { tab, view } = routeOf(hash);
  // `?tab=treasury&view=wallet` links land on the same place as their hash.
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const name = tabs.find((t) => t.toLowerCase() === query.get("tab")?.toLowerCase());
    if (!name) return;
    const target =
      name === "Treasury"
        ? (treasuryViews.find((v) => v.key === query.get("view")) ?? treasuryViews[0]).hash
        : tabHash(name);
    query.delete("tab");
    query.delete("view");
    const rest = query.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${rest ? `?${rest}` : ""}${target}`,
    );
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, []);
  // On phones the tab row scrolls; keep the open tab in view
  useEffect(() => {
    document.getElementById(tabId(tab))?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [tab]);
  function setTab(name: TeamTab, treasury?: TreasuryView) {
    const target =
      name === "Treasury"
        ? treasuryViews.find((v) => v.key === (treasury ?? view))!.hash
        : tabHash(name);
    if (window.location.hash === target) return;
    window.history.pushState(null, "", target);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
  // While the owner's plan has lapsed the server refuses shared edits; hide their controls too.
  // Removing members never locks, so a lapsed team can still be wound down.
  const can = (key: TeamPermission) =>
    (access.owner || access.permissions.includes(key)) && (!gate || key === "removeMembers");
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
    access,
    can,
    data,
    busy,
    now,
    run,
    setTab,
    newEvent: () => setEventOpen(true),
  };
  // One primary action, the one that fits the open tab
  const primary =
    (tab === "Overview" || tab === "Events") && can("manageEvents") ? (
      <button type="button" className="button primary" onClick={() => setEventOpen(true)}>
        <CalendarPlus size={17} aria-hidden="true" /> New event
      </button>
    ) : tab === "Treasury" && view === "loot" && can("manageLoot") ? (
      <button
        type="button"
        className="button primary"
        onClick={() => window.dispatchEvent(new Event(newLootSplitEvent))}
      >
        <Plus size={17} aria-hidden="true" /> New split
      </button>
    ) : tab === "Members" && can("inviteMembers") ? (
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
        emblem={
          <LivelyCrest>
            <TeamMark name={group.name} crestItem={group.crestItem} crestColor={group.crestColor} />
          </LivelyCrest>
        }
        // A player-named title: no ember accent word on someone else's words
        title={group.name}
        description={group.description || "A Team workspace on Outpost."}
        actions={primary}
      >
        <TeamChips
          region={group.region}
          visibility={group.visibility}
          members={data.memberCount}
          recruiting={group.recruiting}
        >
          <span className="landing-chip is-muted">
            Your role:{" "}
            {topRoleName(
              access.owner,
              data.roles,
              data.members.find((m) => m.userId === userId)?.roleIds ?? [],
            )}
          </span>
          {/* What the team plays rides the same row: the tabs stay in the first screen */}
          <TeamActivities list={decodeActivities(group.activities)} />
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
        <div hidden={tab !== "Treasury"}>
          <TeamTreasury
            view={view}
            onView={(next) => setTab("Treasury", next)}
            groupId={groupId}
            userId={userId}
            members={data.members}
            canLoot={can("manageLoot")}
            canPay={can("manageWallet")}
            guildTaxPercent={data.guildTaxPercent}
            canSetTax={can("manageTeam")}
            locked={!!gate}
            active={tab === "Treasury"}
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
        {tab === "Announcements" && <TeamGiveaways groupId={groupId} region={group.region} />}
        {tab === "Settings" && (
          <GroupSettings ctx={ctx} inviteLink={inviteLink} profile={profile} />
        )}
      </div>
      {can("manageEvents") && (
        <GroupEventDialog ctx={ctx} open={eventOpen} onClose={() => setEventOpen(false)} />
      )}
    </>
  );
}

/** A public team seen by someone outside it: ask its leaders to let you in. */
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
          setMessage("Membership request saved. A team leader must approve it.");
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
