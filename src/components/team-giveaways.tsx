"use client";
import { useEffect, useState } from "react";
import type { GiveawayBoard as Board } from "@/lib/giveaways/service";
import { GiveawayBoard } from "./giveaway-board";
import { StatusLine } from "./status-line";
import styles from "./giveaways.module.css";

/**
 * A Team's giveaways, for its members: anyone in the team enters once; members with Manage
 * giveaways start, edit, cancel and draw. Self-contained: it reads and writes through
 * `/api/groups/<id>/giveaways`, which re-checks membership and the permission on every request,
 * so it can sit in any tab of the workspace. While the owner's Supporter status has lapsed
 * (`locked`), members still enter and leave but nobody starts, edits, cancels or draws.
 */
export function TeamGiveaways({
  groupId,
  name,
  region,
  locked = false,
}: {
  groupId: string;
  /** The Team's name, shown as each giveaway's host. */
  name: string;
  region: string;
  locked?: boolean;
}) {
  const endpoint = `/api/groups/${encodeURIComponent(groupId)}/giveaways`;
  const [state, setState] = useState<{ board: Board; at: number } | { error: string } | null>(null);
  useEffect(() => {
    let live = true;
    fetch(endpoint, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Could not load the team's giveaways");
        if (live) setState({ board: body.board, at: Date.now() });
      })
      .catch((e: unknown) => {
        if (live)
          setState({
            error: e instanceof Error ? e.message : "Could not load the team's giveaways",
          });
      });
    return () => {
      live = false;
    };
  }, [endpoint]);
  return (
    <div id="team-giveaways" className={styles.team}>
      {!state ? (
        <StatusLine>Loading the team&rsquo;s giveaways…</StatusLine>
      ) : "error" in state ? (
        <StatusLine tone="error">{state.error}</StatusLine>
      ) : (
        <GiveawayBoard
          initial={state.board}
          locked={locked}
          endpoint={endpoint}
          scope="team"
          host={name}
          defaultRegion={region}
          now={state.at}
        />
      )}
    </div>
  );
}
