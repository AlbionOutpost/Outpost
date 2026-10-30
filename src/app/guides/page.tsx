import { WorkspaceHeading } from "@/components/workspace-heading";
import { GuideDirectory } from "@/components/guide-directory";
import Link from "@/components/build-region-link";
import { libraryGuides } from "@/lib/grind-library";
import { GrindGuideDirectory } from "@/components/grind-guide-directory";
export const metadata = { title: "Guides" };
export default async function Guides({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const category = typeof params.category === "string" ? params.category.slice(0, 100) : "";
  return (
    <div className="guide-discovery-page support-guides">
      <WorkspaceHeading
        glyph="reference"
        scene="guides"
        title="Guides & resources"
        description="Find your footing, plan your next run, or learn a new way to earn."
      />
      <nav className="guide-topic-links" aria-label="Guide shortcuts">
        <Link href="/guides/albion-journal-guide">Track your journal</Link>
        <Link href="/guides?category=Economy">Learn the economy</Link>
        <Link href="/builds/library">Find a loadout</Link>
      </nav>
      <GrindGuideDirectory guides={await libraryGuides()} query={query} category={category} />
      <div className="library-section-heading outpost-guide-heading">
        <div>
          <h2>Getting comfortable with Outpost</h2>
          <p>Short notes for the tools you use here.</p>
        </div>
      </div>
      <GuideDirectory
        guides={[
          {
            id: "market-quotes",
            title: "Read a market quote",
            category: "Economy",
            summary: "Read prices, recognize stale observations and compare city quotes.",
            content: (
              <>
                <p>
                  The lowest sell order is an observed listing from a seller. The highest buy order
                  is an observed offer from a buyer. Select your server, item and quality before
                  comparing cities. Check each observation’s timestamp: stale prices can no longer
                  represent the market, and an unavailable value is not a price of zero.
                </p>
                <p>
                  Outpost uses community contributions from the{" "}
                  <a className="text-link" href="https://www.albion-online-data.com/">
                    Albion Online Data Project
                  </a>
                  . An observation does not prove inventory, volume or that a trade will execute.
                </p>
                <Link className="text-link" href="/tools/market">
                  Compare market observations →
                </Link>
              </>
            ),
          },
          {
            id: "profit",
            title: "Count the whole cost",
            category: "Economy",
            summary: "Account for materials, taxes, return assumptions and transport.",
            content: (
              <>
                <p>
                  Enter your purchase price, sale price and quantity. Add the tax, listing fees and
                  transport assumptions for your own scenario. The trade calculator separates gross
                  revenue, expenses and net profit; margin and return on investment use different
                  denominators. Its example inputs do not establish current game fees.
                </p>
                <p>
                  Production tools cover a starter recipe subset. Review the linked recipe sources,
                  choose which materials qualify for returns and keep manual prices distinct from
                  loaded observations. Missing inputs keep a complete estimate unavailable.
                </p>
                <Link className="text-link" href="/tools/flipping">
                  Plan a trade →
                </Link>
              </>
            ),
          },
          {
            id: "loadouts",
            title: "Build with a purpose",
            category: "Equipment",
            summary: "Choose gear, configure abilities and share the right revision.",
            content: (
              <>
                <p>
                  Start with a content type and a clear equipment plan. The supported equipment
                  picker checks starter-family abilities; the exact-ID fields preserve a manual
                  route for other items. Author-entered item power and ability notes remain
                  estimates or notes, rather than verified combat statistics.
                </p>
                <p>
                  Save a private build while planning. Choose public or unlisted visibility
                  deliberately when sharing. Saved revisions let you preserve earlier plans; copying
                  a build into a comp creates an independent snapshot.
                </p>
                <Link className="text-link" href="/builds/new">
                  Create a loadout →
                </Link>
              </>
            ),
          },
          {
            id: "parties",
            title: "Put every role in place",
            category: "Group play",
            summary: "Plan roles, assign players and keep equipment swaps visible.",
            content: (
              <>
                <p>
                  Choose a party size, assign players and roles, then configure each member’s
                  loadout. Drag the handle to reorder or use the move buttons with a keyboard or
                  touch. Record substitutes and requirements so the plan remains useful when
                  attendance changes.
                </p>
                <p>
                  Team workspaces bring shared comps, announcements, events and RSVP rosters
                  together. Private resources require current membership. Saving a plan does not
                  publish it to Discord or send an external notification.
                </p>
                <Link className="text-link" href="/compositions/new">
                  Plan a comp →
                </Link>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
