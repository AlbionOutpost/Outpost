import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "@/components/link";
import { ItemIcon } from "@/components/item-icon";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Clock3,
  Download,
  Globe2,
  Radio,
  Search,
  ShieldCheck,
} from "lucide-react";
import { cities, regions, regionSchema } from "@/lib/albion/region-config";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Market data & coverage",
  description:
    "Understand market observations, find missing prices and contribute with the Albion Data Project client.",
};
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
  return (
    <article className={styles.page}>
      <Link className={styles.back} href={market}>
        <ArrowLeft size={16} /> Back to your market
      </Link>
      <header className={styles.hero}>
        <div>
          <span className="eyebrow">COMMUNITY MARKET DATA</span>
          <h1>
            Better decisions start with <span>better observations.</span>
          </h1>
          <p>
            Every market price begins with a player. Find the right observation, understand its age,
            and help fill the gaps.
          </p>
          <div className={styles.heroActions}>
            <a
              className="button primary"
              href="https://www.albion-online-data.com/client/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download size={17} /> Get the data client <ArrowUpRight size={16} />
            </a>
            <a className="button secondary" href="#missing-prices">
              Find a missing price
            </a>
          </div>
          <div className={styles.optional}>
            <ShieldCheck size={16} /> Optional to contribute. You can use Outpost without it.
          </div>
        </div>
        <aside className={styles.context} aria-label="Your market selection">
          <div className={styles.contextTop}>
            <Radio size={18} />
            <span>{input.item ? "Your market lookup" : "Try a market lookup"}</span>
          </div>
          <div className={styles.item}>
            <ItemIcon id={item} quality={quality} size={72} />
            <div>
              <strong>{equipmentName(item)}</strong>
              <span>
                {["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"][quality - 1]} quality
              </span>
            </div>
          </div>
          <dl>
            <div>
              <dt>Game server</dt>
              <dd>{regions[region].label}</dd>
            </div>
            <div>
              <dt>City</dt>
              <dd>{city ?? "Compare all cities"}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>Albion Data Project</dd>
            </div>
          </dl>
          <Link href={market} className="button secondary">
            Compare this item <ArrowUpRight size={16} />
          </Link>
        </aside>
      </header>
      <section className={styles.workflow} id="missing-prices" aria-labelledby="workflow-title">
        <div className={styles.sectionHeading}>
          <span className="eyebrow">FILL IN THE GAPS</span>
          <h2 id="workflow-title">Scan. Share. Check.</h2>
          <p>
            The optional client shares orders your game actually loads. Opening a website alone
            cannot refresh an in-game market.
          </p>
        </div>
        <ol className={styles.steps}>
          <li>
            <span className={styles.stepNumber}>01</span>
            <Download size={23} />
            <h3>Run the client</h3>
            <p>
              Get the Albion Data Project client from its official download page, then follow its
              setup instructions for your computer.
            </p>
            <a
              href="https://www.albion-online-data.com/client/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open client guide <ArrowUpRight size={14} />
            </a>
          </li>
          <li>
            <span className={styles.stepNumber}>02</span>
            <Search size={23} />
            <h3>Open the exact orders</h3>
            <p>
              In Albion, visit the city and search the item. Check its tier, enchantment and
              quality, then load the buy or sell orders you need.
            </p>
            <span className={styles.stepNote}>Only orders you open can be shared.</span>
          </li>
          <li>
            <span className={styles.stepNumber}>03</span>
            <Radio size={23} />
            <h3>Check the source time</h3>
            <p>
              Return to Outpost and check prices again. Allow a few minutes for cached responses to
              catch up; compare the observation timestamp.
            </p>
            <Link href={market}>
              Return to your item <ArrowUpRight size={14} />
            </Link>
          </li>
        </ol>
      </section>
      <div className={styles.details}>
        <section className={styles.checklist} aria-labelledby="checks-title">
          <span className="eyebrow">BEFORE YOU RETRY</span>
          <h2 id="checks-title">The right item. The right market.</h2>
          <ul>
            <li>
              <Check size={17} />
              <div>
                <strong>Match your game server</strong>
                <p>
                  Americas, Europe and Asia have separate markets. An observation on another server
                  does not price your item.
                </p>
              </div>
            </li>
            <li>
              <Check size={17} />
              <div>
                <strong>Check quality and enchantment</strong>
                <p>
                  A T8.0 Normal item and a T8.1 Excellent item are different price lookups. Compare
                  other qualities explicitly in Market Explorer.
                </p>
              </div>
            </li>
            <li>
              <Check size={17} />
              <div>
                <strong>Separate buying from selling</strong>
                <p>
                  Sell listings are purchase estimates; buy orders are sale estimates. The Black
                  Market buys eligible equipment from players.
                </p>
              </div>
            </li>
          </ul>
        </section>
        <section className={styles.states} aria-labelledby="states-title">
          <span className="eyebrow">READ THE SIGNAL</span>
          <h2 id="states-title">Know what a price means.</h2>
          <dl>
            <div>
              <dt>
                <span className={styles.recent} /> Recent observation
              </dt>
              <dd>
                Observed within the past hour. Check the game before committing; orders can change.
              </dd>
            </div>
            <div>
              <dt>
                <Clock3 size={14} /> Older observation
              </dt>
              <dd>
                A dated reference for planning. It stays labelled as historical rather than becoming
                a fresh quote.
              </dd>
            </div>
            <div>
              <dt>
                <Search size={14} /> No observation
              </dt>
              <dd>
                No usable price for this exact selection. Try another city or quality, scan it, or
                enter your own price in a calculator.
              </dd>
            </div>
            <div>
              <dt>
                <Globe2 size={14} /> Service unavailable
              </dt>
              <dd>
                The lookup failed. Retry later; a service error does not mean the item has no
                market.
              </dd>
            </div>
          </dl>
        </section>
      </div>
      <footer className={styles.source}>
        <div>
          <strong>Powered by player observations.</strong>
          <p>
            Outpost uses the Albion Online Data Project public API. The client and shared feed are
            maintained by that independent community project.
          </p>
        </div>
        <a href="https://www.albion-online-data.com/" target="_blank" rel="noopener noreferrer">
          About the Data Project <ArrowUpRight size={16} />
        </a>
      </footer>
    </article>
  );
}
