import { archiveShareMetadata } from "@/lib/seo-public";
import type { SeoQuery } from "@/lib/seo";
import { AdSlot } from "@/components/ad-slot";
import Link from "@/components/build-region-link";
import { notFound } from "next/navigation";
import {
  findLibraryGuide,
  libraryGuides,
  libraryJournal,
  libraryFishing,
} from "@/lib/grind-library";
import { FishingCalculator } from "@/components/fishing-calculator";
import { JournalChecklist } from "@/components/journal-checklist";
import { GuideArticleContent } from "@/components/guide-article-content";
import { GuideReadingTools } from "@/components/guide-reading-tools";
import { GuideReader } from "@/components/guide-reader";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { guideDate, readingMinutes } from "@/components/guide-cover-card";
import { Disclosure } from "@/components/disclosure";
import { SectionHeading } from "@/components/section-heading";
import { NextStepCards } from "@/components/next-step-cards";
import { ItemIcon } from "@/components/item-icon";
import { brandCopy } from "@/lib/brand-copy";
import { variantSrcSet } from "@/lib/image-variants";
import {
  guideDek,
  guideReferences,
  guideSections,
  relatedGuides,
  type RelatedGuide,
} from "@/lib/guide-article";
import type { LibraryGuide } from "@/lib/grind-library-types";
import { ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { articleLd, breadcrumbList } from "@/lib/structured-data";
import styles from "./article.module.css";
const guideLd = (guide: LibraryGuide) => {
  const path = `/guides/${encodeURIComponent(guide.slug)}`;
  return [
    articleLd({ ...guide, title: guide.seoTitle ?? guide.title, description: guide.summary, path }),
    breadcrumbList([
      { name: "Home", path: "/" },
      { name: "Guides", path: "/guides" },
      { name: guide.title, path },
    ]),
  ];
};
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SeoQuery>;
}) {
  return archiveShareMetadata("guide", (await params).slug, await searchParams);
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const guide = await findLibraryGuide((await params).slug);
  if (!guide) notFound();
  const date = guideDate(guide.updatedAt);
  const journal = guide.slug === "albion-journal-guide";
  const minutes = readingMinutes(guide.content);
  const cover = guide.cover && (
    <figure className={styles.cover}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static cover with its own srcset */}
      <img
        src={guide.cover.src}
        srcSet={variantSrcSet(guide.cover.src)}
        sizes="(max-width: 900px) calc(100vw - 32px), 440px"
        width={guide.cover.width}
        height={guide.cover.height}
        alt=""
        fetchPriority="high"
        decoding="async"
      />
    </figure>
  );
  return (
    <div className={`${styles.page}${journal ? ` ${styles.journal}` : ""}`}>
      {guideLd(guide).map((data, i) => (
        <JsonLd data={data} key={i} />
      ))}
      <WorkspaceHeading
        scene="guides"
        cover={guide.cover?.src}
        titleId="guide-title"
        title={guide.title}
        accent={journal ? "Journal" : undefined}
        description={
          journal
            ? "Every journal objective in one list. Tick them off as you go; progress stays in this browser, per server."
            : brandCopy(guideDek(guide))
        }
        actions={cover}
      >
        <ul className={`landing-chips ${styles.chips}`} aria-label="About this guide">
          <li className="landing-chip">{guide.category}</li>
          {!journal && <li className="landing-chip is-muted">{minutes} min read</li>}
          <li className="landing-chip is-muted">
            {date ? (
              <time dateTime={guide.updatedAt}>{`Updated ${date}`}</time>
            ) : (
              "Date unavailable"
            )}
          </li>
        </ul>
        <div className={styles.mastheadActions}>
          <Link className="pill-link is-small masthead-back" href="/guides">
            <ArrowLeft size={14} aria-hidden="true" /> All guides
          </Link>
          {!journal && <GuideReadingTools />}
        </div>
      </WorkspaceHeading>
      {journal ? (
        <JournalChecklist entries={await libraryJournal()} />
      ) : (
        <Reader
          guide={guide}
          minutes={minutes}
          date={date}
          related={relatedGuides(guide, await libraryGuides())}
          tool={
            guide.slug === "fishing-leveling-guide" && (
              <section className={styles.tool} aria-labelledby="guide-tool">
                <SectionHeading
                  id="guide-tool"
                  title={
                    <>
                      Fishing fame <em>calculator</em>
                    </>
                  }
                  line="How many fish your next level takes, at your own prices."
                />
                <FishingCalculator fish={await libraryFishing()} initialMode="leveling" compact />
              </section>
            )
          }
        />
      )}
      {journal && (
        <NextStepCards
          id="guide-next"
          title={
            <>
              Plan the next <em>objective</em>
            </>
          }
          line="Find a loadout for the content, or read up before you go."
          link={{ href: "/guides", label: "All guides" }}
          cards={[
            {
              href: "/builds/activities",
              emblem: "strip-builds",
              title: "Builds by activity",
              line: "Loadouts players run for each kind of content.",
              scene: "build",
            },
            {
              href: "/guides",
              emblem: "tool-craft",
              title: "Every guide",
              line: "Progression, gathering, PvE, PvP, trading and crafting.",
              scene: "economy",
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
      )}
    </div>
  );
}

/** The guide itself: contents on the left, the text on its reading page in the middle, what
 * the guide uses on the right, then the guides it leads to. */
function Reader({
  guide,
  minutes,
  date,
  related,
  tool,
}: {
  guide: LibraryGuide;
  minutes: number;
  date: string | null;
  related: RelatedGuide[];
  tool: React.ReactNode;
}) {
  const { intro, sections } = guideSections(guide.content);
  const refs = guideReferences(guide.content);
  return (
    <>
      <div className={styles.layout}>
        <aside className={styles.toc} aria-labelledby="guide-contents">
          <h2 id="guide-contents">In this guide</h2>
          <GuideReader toc={guide.toc} />
          <a className={styles.backTop} href="#guide-title">
            <ArrowUp size={14} aria-hidden="true" /> Back to top
          </a>
        </aside>
        <div className={styles.main}>
          <div className={`raised ${styles.doc}`}>
            {guide.toc.length > 0 && (
              <div className={styles.mobileToc}>
                <Disclosure summary="In this guide" meta={`${guide.toc.length} sections`}>
                  <nav className={styles.mobileContents} aria-label="Guide contents">
                    {guide.toc.map((item) => (
                      <a href={`#${item.id}`} key={item.id}>
                        {item.title}
                      </a>
                    ))}
                  </nav>
                </Disclosure>
              </div>
            )}
            <article className={`guide-prose ${styles.prose}`} data-guide-article>
              {intro.length > 0 && (
                <div className={styles.intro}>
                  <GuideArticleContent nodes={intro} />
                </div>
              )}
              {sections.map((section, i) => (
                <section
                  key={i}
                  className={styles.section}
                  data-guide-section
                  data-tone={section.tone}
                  aria-labelledby={section.id}
                >
                  <h2 id={section.id} className={styles.sectionTitle}>
                    {section.charge && (
                      // eslint-disable-next-line @next/next/no-img-element -- painted charge, decorative
                      <img
                        className={styles.charge}
                        src={`/albion/charges/${section.charge}.webp`}
                        alt=""
                        width={40}
                        height={40}
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                    <span>{brandCopy(section.title)}</span>
                  </h2>
                  <GuideArticleContent nodes={section.nodes} />
                </section>
              ))}
              <p className={styles.patchNote}>
                Game balance changes between patches. Check requirements, yields and costs in game.
              </p>
            </article>
          </div>
          {tool}
          <AdSlot placement="article" />
        </div>
        <aside className={styles.facts} aria-label="Guide details">
          <div className={styles.factCard}>
            <h2>About this guide</h2>
            <dl className={styles.factList}>
              <div>
                <dt>Topic</dt>
                <dd>{guide.category}</dd>
              </div>
              <div>
                <dt>Reading time</dt>
                <dd>{minutes} min</dd>
              </div>
              <div>
                <dt>Sections</dt>
                <dd>{sections.length}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{date ? <time dateTime={guide.updatedAt}>{date}</time> : "Unavailable"}</dd>
              </div>
              <div>
                <dt>Written by</dt>
                <dd>{guide.author}</dd>
              </div>
            </dl>
          </div>
          {refs.tools.length > 0 && (
            <div className={styles.factCard}>
              <h2>Tools in this guide</h2>
              <ul className={styles.toolList}>
                {refs.tools.map((t) => (
                  <li key={t.href}>
                    <Link href={t.href}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- painted tool emblem */}
                      <img
                        src={`/albion/icons/${t.emblem}-64w.webp`}
                        alt=""
                        width={32}
                        height={32}
                        loading="lazy"
                      />
                      <span>{t.title}</span>
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {refs.items.length > 0 && (
            <div className={styles.factCard}>
              <h2>Items in this guide</h2>
              <ul className={styles.itemList}>
                {refs.items.map((item) => (
                  <li key={item.id}>
                    <Link href={`/items/${encodeURIComponent(item.id)}`} title={item.name}>
                      <ItemIcon id={item.id} size={44} />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
      {related.length > 0 && (
        <section className={styles.related} aria-labelledby="guide-related">
          <SectionHeading
            id="guide-related"
            title={
              <>
                Read <em>next</em>
              </>
            }
            line="The guides this one points to, or that point back to it."
            link={{ href: "/guides", label: "All guides" }}
          />
          <ul className={styles.relatedList}>
            {related.map(({ guide: next, reason }) => (
              <li key={next.slug}>
                <Link href={`/guides/${next.slug}`} className={styles.relatedCard}>
                  {next.cover && (
                    // eslint-disable-next-line @next/next/no-img-element -- static cover with its own srcset
                    <img
                      src={next.cover.src}
                      srcSet={variantSrcSet(next.cover.src)}
                      sizes="(max-width: 700px) 120px, 400px"
                      width={next.cover.width}
                      height={next.cover.height}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                  <span className={styles.relatedCopy}>
                    <span className={styles.relatedReason}>{reason}</span>
                    <strong>{next.title}</strong>
                    <span>{brandCopy(guideDek(next))}</span>
                    <span className={styles.relatedMeta}>
                      {next.category} · {readingMinutes(next.content)} min read
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
