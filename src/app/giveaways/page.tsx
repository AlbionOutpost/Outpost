import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { authOptions } from "@/lib/auth";
import { regionSchema } from "@/lib/albion/region-config";
import { giveawayBoard } from "@/lib/giveaways/service";
import { signInPath } from "@/lib/sign-in-return";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { GiveawayBoard } from "@/components/giveaway-board";
import styles from "./giveaways.module.css";

/** The request's clock, read once per server render. */
const renderedAt = () => Date.now();

export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/giveaways", await searchParams);
}

/**
 * Site-wide giveaways run by Outpost staff. Anyone can read the board; a signed-in player enters
 * once and sees their own status, guests get a sign-in that returns here. Staff (a current
 * global ADMIN) start, edit, cancel and draw on the same board; the server checks every change.
 */
export default async function GiveawaysPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  const params = await searchParams;
  const region = regionSchema
    .catch("europe")
    .parse(params.region || (await cookies()).get("atlas-region")?.value);
  const session = await getServerSession(authOptions);
  const board = await giveawayBoard(null, session?.user?.id ?? null);
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        compact
        scene="economy"
        title="Outpost giveaways"
        accent="giveaways"
        description="Free in-game prizes from Outpost staff. Enter once with your Discord account; the server draws the winners at random after entries close."
        emblem={
          // eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem
          <img
            className="painted-emblem"
            src="/albion/icons/trophy-gold.webp"
            alt=""
            width={64}
            height={64}
          />
        }
      />
      <GiveawayBoard
        initial={board}
        endpoint="/api/giveaways"
        scope="site"
        defaultRegion={region}
        now={renderedAt()}
        signIn={board.signedIn ? undefined : signInPath("/giveaways")}
      />
    </div>
  );
}
