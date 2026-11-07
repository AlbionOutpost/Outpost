import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "@/components/link";
import { ItemIcon } from "@/components/item-icon";
import { ArrowLeft, ArrowUpRight, Check } from "lucide-react";
import { cities, regions, regionSchema } from "@/lib/albion/region-config";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { SectionHeading } from "@/components/section-heading";
import { PanelHead } from "@/components/panel-head";
import { Unavailable } from "@/components/status-line";
import { MarketNextSteps } from "@/components/market-next-steps";
import styles from "./page.module.css";
import marketPage from "@/components/market-page.module.css";

const client = "https://www.albion-online-data.com/client/";

export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/market-data", await searchParams);
}
export default async function MarketDataPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const input = Object.fromEntries(
    Object.entries(await searchParams).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );
  const jar = await cookies();
  let preference = input.region || jar.get("atlas-region")?.value;
  if (!preference) {
    const session = await getServerSession(authOptions);
    const user = session?.user?.id
      ? await db.user.findUnique({
          where: { id: session.user.id },
          select: { region: true },
        })
      : null;
    preference = user?.region;
  }
  const region = regionSchema.catch("europe").parse(preference);
  const item = /^[A-Z0-9_@]{3,100}$/.test(input.item ?? "") ? input.item! : "T4_BAG";
  const quality = /^[1-5]$/.test(input.quality ?? "") ? Number(input.quality) : 1;
  const city = cities.find((city) => city === input.city);
  const market = `/tools/market?${new URLSearchParams({ region, item, quality: String(quality), ...(city ? { city } : {}) })}`;
  const steps = [
    {
      title: "Run the client",
      line: "Download the Albion Online Data Project client from its official page and follow its setup for your computer.",
      action: (
        <a href={client} target="_blank" rel="noopener noreferrer" className="pill-link is-small">
          Client download <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      ),
    },
    {
      title: "Open the exact orders",
      line: "In game, go to the city market and search the item. Match its tier, enchantment and quality, then open the buy or sell orders.",
      action: <span className={styles.stepNote}>Only orders you open are shared.</span>,
    },
    {
      title: "Check the time it was seen",
      line: "Come back and load the prices again. Give it a few minutes, then look for the new time next to the price.",
      action: (
        <Link href={market} className="pill-link is-small">
          Back to your item <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      ),
    },
  ];
  return (
    <article className={`${styles.page} ${marketPage.page}`}>
      <WorkspaceHeading
        glyph="market"
        scene="market"
        title="Market data"
        accent="data"
        description="Where Outpost's prices come from, why one can be missing, and how you can fill it in. Sharing is optional; every tool works without it."
        actions={
          <a className="button primary" href={client} target="_blank" rel="noopener noreferrer">
            Get the data client <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        }
      >
        <Link className="pill-link is-small masthead-back" href={market}>
          <ArrowLeft size={14} aria-hidden="true" /> Back to your market
        </Link>
      </WorkspaceHeading>

      <section className={styles.section} id="missing-prices" aria-labelledby="workflow-title">
        <SectionHeading
          id="workflow-title"
          title={
            <>
              Fill a missing <em>price</em>
            </>
          }
          line="The client shares the orders your game loads. A website can't refresh an in-game market on its own."
        />
        <ol className={styles.steps}>
          {steps.map((step, index) => (
            <li key={step.title} className={`raised has-scene ${styles.step}`} data-scene="market">
              <PanelHead step={index + 1} title={step.title} as="h3" />
              <p>{step.line}</p>
              <div className={styles.stepAction}>{step.action}</div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="read-title">
        <SectionHeading
          id="read-title"
          title={
            <>
              Before you <em>trust</em> a price
            </>
          }
          line="What a price belongs to, what to check, and what each state means."
        />
        <div className={styles.reading}>
          <aside className={`raised ${styles.panel}`} aria-label="Your market selection">
            <PanelHead
              title={input.item ? "Your lookup" : "Try a lookup"}
              line="The exact selection a price belongs to."
              as="h3"
            />
            <div className={styles.item}>
              <span className={styles.itemWell}>
                <ItemIcon id={item} quality={quality} size={64} />
              </span>
              <div>
                <strong>{equipmentName(item)}</strong>
                <span>
                  {["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"][quality - 1]}{" "}
                  quality
                </span>
              </div>
            </div>
            <dl className={styles.facts}>
              <div>
                <dt>Server</dt>
                <dd>{regions[region].label}</dd>
              </div>
              <div>
                <dt>City</dt>
                <dd>{city ?? "Every city"}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>Albion Online Data Project</dd>
              </div>
            </dl>
            <Link href={market} className="button secondary">
              Compare this item <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </aside>
          <section className={`raised ${styles.panel}`} aria-labelledby="checks-title">
            <PanelHead id="checks-title" title="Before you retry" as="h3" />
            <ul className={styles.checks}>
              <li>
                <Check size={17} aria-hidden="true" />
                <div>
                  <strong>Match your server</strong>
                  <p>
                    Americas, Europe and Asia are separate markets. A price from another server does
                    not price your item.
                  </p>
                </div>
              </li>
              <li>
                <Check size={17} aria-hidden="true" />
                <div>
                  <strong>Match quality and enchantment</strong>
                  <p>
                    A T8.0 Normal and a T8.1 Excellent are two different lookups. Market Explorer
                    shows the other qualities.
                  </p>
                </div>
              </li>
              <li>
                <Check size={17} aria-hidden="true" />
                <div>
                  <strong>Buy order or sell order</strong>
                  <p>
                    You pay the sell order to buy now and get the buy order to sell now. The Black
                    Market only buys.
                  </p>
                </div>
              </li>
            </ul>
          </section>
          <section className={`raised ${styles.panel}`} aria-labelledby="states-title">
            <PanelHead id="states-title" title="What you'll see" as="h3" />
            <dl className={styles.states}>
              <div>
                <dt>
                  <span className={styles.recent} aria-hidden="true" /> Recent
                </dt>
                <dd>
                  Seen in the last hour. Orders still move, so check in game before you commit.
                </dd>
              </div>
              <div>
                <dt>
                  <span className={styles.stale}>Stale</span>
                </dt>
                <dd>
                  Older than an hour. Fine for planning; it keeps its date and never looks fresh.
                </dd>
              </div>
              <div>
                <dt>
                  <Unavailable />
                </dt>
                <dd>
                  Nobody has shared this exact order yet. Try another city or quality, scan it, or
                  type your own price into a calculator.
                </dd>
              </div>
              <div>
                <dt className={styles.failed}>Could not load</dt>
                <dd>
                  The lookup failed. Try again later; it does not mean the item has no market.
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </section>

      <footer className={`raised ${styles.source}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
        <img src="/albion/icons/strip-content.webp" alt="" width={48} height={48} />
        <div>
          <strong>Powered by player observations</strong>
          <p>
            Outpost reads the Albion Online Data Project&apos;s public API. The client and the
            shared feed belong to that independent community project.
          </p>
        </div>
        <a
          className="button secondary"
          href="https://www.albion-online-data.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          About the Data Project <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </footer>
      <MarketNextSteps
        show={["market", "crafting", "planner"]}
        title={
          <>
            Use the <em>prices</em>
          </>
        }
        line="Once the orders are in, these tools turn them into a purchase, a craft or a shopping list."
      />
    </article>
  );
}
