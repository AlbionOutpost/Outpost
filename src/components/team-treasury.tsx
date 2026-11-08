"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Coins, Plus, Wallet } from "lucide-react";
import type { TeamWalletView } from "@/lib/groups/economy-service";
import { walletChangedEvent } from "./economy-motion";
import { StatusLine } from "./status-line";
import { TeamLootWorkspace, newLootSplitEvent } from "./team-loot-workspace";
import { TreasuryHero } from "./team-treasury-hero";
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
 * The Team's silver in one place: the pot and the latest ledger lines on top, then loot splits,
 * the wallet and rolls & flips, one view at a time under a segmented control. Each view has its
 * own link. The loot split stays mounted so an unsaved split survives switching views. The
 * wallet is read once here and shared by the hero and the Wallet view.
 */
export function TeamTreasury({
  view,
  onView,
  groupId,
  userId,
  members,
  canLoot,
  canPay,
  guildTaxPercent = 0,
  canSetTax = false,
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
  /** The team's guild tax rate, offered as a toggle on the split. */
  guildTaxPercent?: number;
  /** Manage team: may set the guild tax rate from a loot split. */
  canSetTax?: boolean;
  locked: boolean;
  active: boolean;
}) {
  const [wallet, setWallet] = useState<TeamWalletView | null>(null);
  const [walletError, setWalletError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [loadedFor, setLoadedFor] = useState(-1);
  useEffect(() => {
    if (!active || loadedFor === attempt) return;
    const controller = new AbortController();
    fetch(`/api/groups/${groupId}/wallet`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setWallet(body.wallet);
        setLoadedFor(attempt);
        setWalletError("");
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setWalletError(e instanceof Error ? e.message : "The wallet could not be loaded.");
      });
    return () => controller.abort();
  }, [active, attempt, loadedFor, groupId]);
  // A split paid in or a roll's silver shared elsewhere on the page: read the wallet again.
  useEffect(() => {
    const reload = () => setAttempt((n) => n + 1);
    window.addEventListener(walletChangedEvent, reload);
    return () => window.removeEventListener(walletChangedEvent, reload);
  }, []);
  const reload = () => setAttempt((n) => n + 1);
  /** Switch view, then bring `target` (an id) into view and focus it once it has rendered. */
  const go = (next: TreasuryView, target?: string) => {
    onView(next);
    if (!target) return;
    let tries = 0;
    const find = () => {
      const el = document.getElementById(target);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        el.focus({ preventScroll: true });
      } else if (tries++ < 40) requestAnimationFrame(find);
    };
    requestAnimationFrame(find);
  };
  const canBook = !!wallet?.canManage && !locked;
  const actions = (
    <>
      {canLoot && !locked && (
        <button
          type="button"
          className="button primary"
          onClick={() => {
            window.dispatchEvent(new Event(newLootSplitEvent));
            go("loot", "loot-split-name");
          }}
        >
          <Plus size={17} aria-hidden="true" /> New split
        </button>
      )}
      {canBook && (
        <button
          type="button"
          className="button secondary"
          onClick={() => go("wallet", "wallet-amount")}
        >
          <Wallet size={16} aria-hidden="true" /> Book silver
        </button>
      )}
      <button
        type="button"
        className={`button ${canLoot && !locked ? "secondary" : "primary"}`}
        onClick={() => go("rolls", "coin-flip-stage")}
      >
        <Coins size={16} aria-hidden="true" /> Flip a coin
      </button>
    </>
  );
  return (
    <div className={styles.treasuryShell}>
      <TreasuryHero
        wallet={wallet}
        error={walletError}
        onRetry={reload}
        actions={actions}
        onLedger={() => go("wallet", "wallet-ledger")}
      />
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
          guildTaxPercent={guildTaxPercent}
          canSetTax={canSetTax}
          active={active && view === "loot"}
        />
      </div>
      {active && view === "wallet" && (
        <TeamWallet
          groupId={groupId}
          members={members}
          locked={locked}
          view={wallet}
          error={walletError}
          refreshing={loadedFor !== attempt}
          onView={setWallet}
          onRetry={reload}
        />
      )}
      {active && view === "rolls" && (
        <TeamGames groupId={groupId} userId={userId} members={members} active locked={locked} />
      )}
    </div>
  );
}
