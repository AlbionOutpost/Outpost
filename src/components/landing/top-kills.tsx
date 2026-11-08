"use client";
import { ArrowRight } from "lucide-react";
import Link from "@/components/link";
import { KillCard } from "@/components/kill-card";
import type { TopKill } from "@/lib/albion/combat-events";
import type { LandingKill as Kill, LandingKills as Feed } from "@/lib/landing-data";
import { useLandingPart } from "./landing-data";
type Player = TopKill["killer"];

/** The game reports some kills without the gear worn (hidden or not captured); the board
 * shows the three highest-fame kills where both sides' gear was recorded. */
const geared = (p: Player) => p.equipment.some((e) => e.itemId);
const shown = (events: Kill[]) =>
  events.filter((e) => geared(e.killer) && geared(e.victim)).slice(0, 3);

/**
 * The three highest-fame kills in the source's ranking as killboards: both loadouts, kill fame,
 * an estimated gear value, what the victim carried and, on request, every participant with
 * their kit. The section heading says how old the kills are; nothing is estimated silently.
 */
export function TopKills({ suffix, serverName }: { suffix: string; serverName: string }) {
  const kills = useLandingPart("kills");
  const feed = kills?.value as Feed | undefined;
  return (
    <section className="landing-wrap landing-kills" aria-labelledby="home-kills-title">
      <div className="section-heading landing-section-heading">
        <h2 id="home-kills-title">
          Top kills <em>this week</em>
        </h2>
        <p>
          The three most valuable kills on {serverName} in the last seven days, by the estimated
          silver value of the victim&apos;s gear.
        </p>
        <Link className="pill-link" href={`/tools/kill-feed${suffix}`}>
          Open the kill feed <ArrowRight size={15} />
        </Link>
      </div>
      {!kills?.value || !feed ? (
        <p className="landing-preview-status" role="status">
          {kills?.error ?? "Loading the kill ranking…"}
        </p>
      ) : !shown(feed.events).length ? (
        <p className="landing-preview-status" role="status">
          No ranked kill has both loadouts recorded right now.
        </p>
      ) : (
        <div className="kill-grid">
          {shown(feed.events).map((ev, rank) => (
            <KillCard key={ev.id} event={ev} at={kills.at} gearValue={ev.gearValue} rank={rank} />
          ))}
        </div>
      )}
    </section>
  );
}
