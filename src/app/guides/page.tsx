import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { AdSlot } from "@/components/ad-slot";
import { WorkspaceHeading } from "@/components/workspace-heading";
import Link from "@/components/build-region-link";
import { libraryGuides } from "@/lib/grind-library";
import { JsonLd } from "@/components/json-ld";
import { itemListLd } from "@/lib/structured-data";
import { GrindGuideDirectory, type ToolNote } from "@/components/grind-guide-directory";
import { NextStepCards } from "@/components/next-step-cards";
import styles from "./guides.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/guides", await searchParams);
}

const notes: ToolNote[] = [
  {
    id: "market-quotes",
    title: "Read a market quote",
    text: "The lowest sell order is what a seller asks; the highest buy order is what a buyer offers. Check each price's age and city. Unavailable is not zero. Albion Online Data Project",
    body: (
      <>
        <p>
          The lowest sell order is what a seller asks; the highest buy order is what a buyer offers.
          Pick your server, item and quality, then check each price’s age before you compare cities.
          An unavailable price is not zero.
        </p>
        <p>
          Prices are uploaded by players to the{" "}
          <a href="https://www.albion-online-data.com/">Albion Online Data Project</a>. A listing
          does not prove stock, volume or that a trade will fill.
        </p>
      </>
    ),
    link: { href: "/tools/market", label: "Open Market Explorer" },
  },
  {
    id: "profit",
    title: "Count the whole cost",
    text: "Enter what you pay, what you sell for and how many. Add tax, listing fees and transport. Choose which materials get return assumptions. Production tools keep your own prices apart.",
    body: (
      <>
        <p>
          Enter what you pay, what you sell for and how many, then add tax, listing fees and
          transport for your own run. Margin and return on investment divide by different things.
        </p>
        <p>
          Production tools cover a starter set of recipes. Choose which materials get return
          assumptions; your own prices stay marked apart from loaded ones, and a missing input
          leaves the result unavailable.
        </p>
      </>
    ),
    link: { href: "/tools/flipping", label: "Plan a trade" },
  },
  {
    id: "loadouts",
    title: "Build with a purpose",
    text: "Start from the content you run. IP and ability notes you type are your notes, not verified stats. Keep a build private, public or unlisted. Revisions. Copying a build into a comp.",
    body: (
      <>
        <p>
          Start from the content you run and pick gear for it. IP and ability notes you type stay
          your notes, not verified combat stats.
        </p>
        <p>
          Keep a build private while you plan, and make it public or unlisted when you share it.
          Saved revisions keep earlier versions; copying a build into a comp makes its own copy.
        </p>
      </>
    ),
    link: { href: "/builds/new", label: "Create a build" },
  },
  {
    id: "parties",
    title: "Put every role in place",
    text: "Pick a party size, assign players and roles, set each loadout, swaps, substitutes. Teams share comps, announcements, events and sign-ups. Saving does not post to Discord.",
    body: (
      <>
        <p>
          Pick a party size, assign players and roles, then set each loadout and its swaps. Drag to
          reorder, or use the move buttons from a keyboard or touch screen.
        </p>
        <p>
          Teams share comps, announcements, events and sign-ups with current members only. Saving a
          plan does not post it to Discord.
        </p>
      </>
    ),
    link: { href: "/compositions/new", label: "Plan a comp" },
  },
];

export default async function Guides({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const category = typeof params.category === "string" ? params.category.slice(0, 100) : "";
  const guides = await libraryGuides();
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        glyph="reference"
        scene="guides"
        title="Albion Online guides"
        accent="guides"
        description="Player-written guides for progression, gathering, PvE and making silver, plus short notes on how Outpost’s tools work."
        actions={
          <Link className="button secondary" href="/guides/albion-journal-guide">
            Track your journal
          </Link>
        }
      />
      <JsonLd
        data={itemListLd(
          "Albion Online guides",
          guides.map((g) => ({
            name: g.title,
            path: `/guides/${encodeURIComponent(g.slug)}`,
          })),
        )}
      />
      <GrindGuideDirectory guides={guides} notes={notes} query={query} category={category} />
      <AdSlot placement="hub" />
      <NextStepCards
        id="guides-next"
        title={
          <>
            Take it into your next <em>run</em>
          </>
        }
        line="Read up, then pick a loadout, price the trip or plan the party."
        link={{ href: "/tools", label: "All tools" }}
        cards={[
          {
            href: "/builds/activities",
            emblem: "strip-builds",
            title: "Builds by activity",
            line: "Loadouts players run for each kind of content.",
            scene: "build",
          },
          {
            href: "/tools/market",
            emblem: "tool-market",
            title: "Market Explorer",
            line: "Prices in every city, so you know where to buy and where to dump.",
            scene: "market",
          },
          {
            href: "/compositions",
            emblem: "strip-comps",
            title: "Comps",
            line: "Plan the party: roles, loadouts and swaps for every slot.",
            scene: "composition",
          },
        ]}
      />
    </div>
  );
}
