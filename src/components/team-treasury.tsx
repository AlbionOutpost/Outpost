"use client";
import dynamic from "next/dynamic";
import { StatusLine } from "./status-line";
import { TeamLootWorkspace } from "./team-loot-workspace";
import styles from "./team-economy.module.css";

// Wallet and Rolls & flips (and their 3D scenes) load when first opened.
const loading = () => <StatusLine>Opening the treasury…</StatusLine>;
const TeamWallet = dynamic(() => import("./team-wallet").then((m) => m.TeamWallet), { loading });
const TeamGames = dynamic(() => import("./team-games").then((m) => m.TeamGames), { loading });

export type TreasuryView = "loot" | "wallet" | "rolls";
export const treasuryViews: { key: TreasuryView; label: string; hash: string; legacy: string }[] = [
  { key: "loot", label: "Loot splits", hash: "#team-treasury", legacy: "#team-loot-splits" },
  { key: "wallet", label: "Wallet", hash: "#team-treasury-wallet", legacy: "#team-wallet" },
  {
    key: "rolls",
    label: "Rolls & flips",
    hash: "#team-treasury-rolls",
    legacy: "#team-rolls-flips",
  },
];
/** The Treasury view a hash opens: its own hashes and the old Loot, Wallet and Rolls tab links. */
export function treasuryViewOf(hash: string): TreasuryView | null {
  if (hash === "#team-treasury-loot") return "loot";
  return treasuryViews.find((v) => v.hash === hash || v.legacy === hash)?.key ?? null;
}

/**
 * The Team's silver in one place: loot splits, the wallet and rolls & flips, one view at a time
 * under a segmented control. Each view has its own link. The loot split stays mounted so an
 * unsaved split survives switching views.
 */
export function TeamTreasury({
  view,
  onView,
  groupId,
  userId,
  members,
  canLoot,
  canPay,
  locked,
  active,
}: {
  view: TreasuryView;
  onView: (view: TreasuryView) => void;
  groupId: string;
  userId: string;
  members: { userId: string; name: string; avatarFrame?: string | null }[];
  canLoot: boolean;
  canPay: boolean;
  locked: boolean;
  active: boolean;
}) {
  return (
    <div className={styles.treasuryShell}>
      <nav className={`segmented ${styles.treasuryNav}`} aria-label="Treasury">
        {treasuryViews.map((v) => (
          <a
            key={v.key}
            href={v.hash}
            aria-current={view === v.key ? "page" : undefined}
            onClick={(e) => {
              e.preventDefault();
              onView(v.key);
            }}
          >
            {v.label}
          </a>
        ))}
      </nav>
      <div hidden={view !== "loot"}>
        <TeamLootWorkspace
          groupId={groupId}
          userId={userId}
          members={members}
          editable={canLoot}
          canPay={canPay}
          active={active && view === "loot"}
        />
      </div>
      {active && view === "wallet" && (
        <TeamWallet groupId={groupId} members={members} active locked={locked} />
      )}
      {active && view === "rolls" && (
        <TeamGames groupId={groupId} userId={userId} members={members} active locked={locked} />
      )}
    </div>
  );
}
