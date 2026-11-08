"use client";
import type { ReactNode } from "react";
import { ArrowRight, Coins, RotateCcw, Scale, Wallet } from "lucide-react";
import type { TeamWalletView } from "@/lib/groups/economy-service";
import { bookkeepingLine } from "@/lib/groups/economy";
import { signedSilver, silverText, useCountUp } from "./economy-motion";
import styles from "./team-economy.module.css";

export const kindLabel: Record<string, string> = {
  credit: "Credit",
  debit: "Debit",
  payout: "Payout",
  reset: "Reset",
  split: "Loot split",
  roll: "Loot roll",
};
export const shortTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function Figure({ value }: { value: number }) {
  const shown = useCountUp(value, { duration: 1100, from: 0 });
  return (
    <>
      <span aria-hidden="true">{silverText(shown)}</span>
      <span className="sr-only">{silverText(value)}</span>
    </>
  );
}

/**
 * The top of the Treasury: the team pot as the headline figure, the viewer's balance, the
 * latest ledger lines and the actions that start the Team's silver jobs. A new team gets the
 * three steps that fill it instead of an empty ledger. Figures are the server's sums.
 */
export function TreasuryHero({
  wallet,
  error,
  onRetry,
  actions,
  onLedger,
}: {
  wallet: TeamWalletView | null;
  error: string;
  onRetry: () => void;
  actions: ReactNode;
  /** Open the full ledger (the Wallet view). */
  onLedger: () => void;
}) {
  const recent = wallet?.entries.slice(0, 4) ?? [];
  const owed = wallet?.members?.reduce((t, m) => t + m.balance, 0);
  // A new team: nothing booked anywhere yet.
  const fresh = !!wallet && !wallet.entries.length && !wallet.pot && !wallet.balance && !owed;
  return (
    <section className={`panel ${styles.hero}`} aria-labelledby="treasury-pot">
      <div className={styles.heroPot}>
        <div className={styles.heroMark} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- painted silver */}
          <img src="/albion/icons/silver-128w.webp" alt="" />
        </div>
        <div className={styles.heroFigures}>
          <h2 id="treasury-pot" className={styles.heroLabel}>
            Team pot
          </h2>
          {wallet ? (
            <p className={styles.heroFigure}>
              <Figure value={wallet.pot} />
              <small>silver</small>
            </p>
          ) : error ? (
            <p className={styles.heroFigure} data-missing="">
              —<small>Unavailable</small>
            </p>
          ) : (
            <p className={styles.heroFigure} data-loading="">
              <span className={styles.skeleton} />
              <span className="sr-only">Loading the team pot…</span>
            </p>
          )}
          <dl className={styles.heroStats}>
            <div>
              <dt>Your balance</dt>
              <dd>{wallet ? silverText(wallet.balance) : "—"}</dd>
            </div>
            {owed !== undefined && (
              <div>
                <dt>Owed to members</dt>
                <dd>{silverText(owed)}</dd>
              </div>
            )}
          </dl>
        </div>
        <div className={styles.heroActions}>{actions}</div>
        <p className={styles.heroNote}>{bookkeepingLine}</p>
      </div>

      <div className={`well ${styles.heroFeed}`}>
        {error && !wallet ? (
          <div className={styles.heroError} role="alert">
            <strong>The wallet could not be loaded.</strong>
            <span>{error}</span>
            <button type="button" className="pill-link is-small" onClick={onRetry}>
              <RotateCcw size={14} aria-hidden="true" /> Try again
            </button>
          </div>
        ) : fresh ? (
          <div className={styles.heroStart}>
            <h3>Start the team&apos;s books</h3>
            <ol>
              <li>
                <span aria-hidden="true">
                  <Scale size={18} />
                </span>
                <strong>Record a haul</strong>
                <small>Loot splits share a pool after costs and guild tax.</small>
              </li>
              <li>
                <span aria-hidden="true">
                  <Wallet size={18} />
                </span>
                <strong>Pay shares into wallets</strong>
                <small>Each member sees what the team owes them.</small>
              </li>
              <li>
                <span aria-hidden="true">
                  <Coins size={18} />
                </span>
                <strong>Settle drops</strong>
                <small>Loot rolls and coin flips, thrown by the server.</small>
              </li>
            </ol>
          </div>
        ) : (
          <>
            <div className={styles.heroFeedHead}>
              <h3>{wallet?.canManage ? "Recent activity" : "Your recent activity"}</h3>
              {wallet && (
                <button type="button" className={styles.heroLink} onClick={onLedger}>
                  Full ledger <ArrowRight size={14} aria-hidden="true" />
                </button>
              )}
            </div>
            {wallet ? (
              <ul className={styles.heroLedger} aria-label="Latest wallet changes">
                {recent.map((e) => (
                  <li key={e.id}>
                    <span
                      className={styles.heroDelta}
                      data-sign={e.amount > 0 ? "+" : e.amount < 0 ? "-" : undefined}
                    >
                      {signedSilver(e.amount)}
                    </span>
                    <span className={styles.heroLine}>
                      <strong>
                        {e.name}
                        <span className={styles.kind}>{kindLabel[e.kind] ?? e.kind}</span>
                      </strong>
                      <small>
                        {[e.reason, e.by ?? "Former member"].filter(Boolean).join(" · ")}
                      </small>
                    </span>
                    <time dateTime={e.createdAt}>{shortTime(e.createdAt)}</time>
                  </li>
                ))}
                {!recent.length && (
                  <li className={styles.heroQuiet}>
                    No changes to your balance yet. The team pot has its own entries.
                  </li>
                )}
              </ul>
            ) : (
              <ul className={styles.heroLedger} aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <li key={i}>
                    <span className={styles.skeleton} />
                    <span className={styles.skeleton} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  );
}
