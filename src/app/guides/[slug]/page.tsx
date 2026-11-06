import { archiveShareMetadata } from "@/lib/seo-public";
import type { SeoQuery } from "@/lib/seo";
import { AdSlot } from "@/components/ad-slot";
import Link from "@/components/build-region-link";
import { notFound } from "next/navigation";
import { findLibraryGuide, libraryJournal, libraryFishing } from "@/lib/grind-library";
import { FishingCalculator } from "@/components/fishing-calculator";
import { JournalChecklist } from "@/components/journal-checklist";
import { GuideArticleContent } from "@/components/guide-article-content";
import { GuideReadingTools } from "@/components/guide-reading-tools";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { guideDate, readingMinutes } from "@/components/guide-cover-card";
import { Disclosure } from "@/components/disclosure";
import { SectionHeading } from "@/components/section-heading";
import { NextStepCards } from "@/components/next-step-cards";
import { brandCopy } from "@/lib/brand-copy";
import { ArrowLeft, ArrowUp } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { articleLd, breadcrumbList } from "@/lib/structured-data";
import styles from "./article.module.css";
const guideLd = (guide: {
  title: string;
  slug: string;
  summary: string;
  author: string;
  updatedAt: string;
}) => {
  const path = `/guides/${encodeURIComponent(guide.slug)}`;
  return [
    articleLd({ ...guide, description: guide.summary, path }),
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
/** The summary's first sentence: the article itself opens with the full summary. */
const lede = (summary: string) => summary.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? summary;
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const guide = await findLibraryGuide((await params).slug);
  if (!guide) notFound();
  const date = guideDate(guide.updatedAt);
  const journal = guide.slug === "albion-journal-guide";
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
            : lede(brandCopy(guide.summary))
        }
      >
        <ul className={`landing-chips ${styles.chips}`} aria-label="About this guide">
          <li className="landing-chip">{guide.category}</li>
          {!journal && (
            <li className="landing-chip is-muted">{readingMinutes(guide.content)} min read</li>
          )}
          <li className="landing-chip is-muted">By {guide.author}</li>
          <li className="landing-chip is-muted">{date ? `Updated ${date}` : "Date unavailable"}</li>
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
        <>
          <div className={styles.layout}>
            <aside className={`raised ${styles.rail}`} aria-labelledby="guide-contents">
              <h2 id="guide-contents">In this guide</h2>
              {guide.toc.length > 0 && <Contents toc={guide.toc} />}
              <p className={styles.railNote}>
                Game balance changes between patches. Check requirements, yields and costs in game.
              </p>
              <a className="pill-link is-small" href="#guide-title">
                <ArrowUp size={14} aria-hidden="true" /> Back to top
              </a>
            </aside>
            <div className={styles.body}>
              <div className={`raised ${styles.doc}`}>
                {guide.toc.length > 0 && (
                  <div className={styles.mobileToc}>
                    <Disclosure summary="In this guide" meta={`${guide.toc.length} sections`}>
                      <Contents toc={guide.toc} />
                    </Disclosure>
                  </div>
                )}
                <article className={`guide-prose ${styles.prose}`}>
                  <GuideArticleContent nodes={guide.content} />
                </article>
              </div>
              {guide.slug === "fishing-leveling-guide" && (
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
              )}
              <AdSlot placement="article" />
            </div>
          </div>
        </>
      )}
      <NextStepCards
        id="guide-next"
        title={
          journal ? (
            <>
              Plan the next <em>objective</em>
            </>
          ) : (
            <>
              Make it your next <em>run</em>
            </>
          )
        }
        line={
          journal
            ? "Find a loadout for the content, or read up before you go."
            : "Pick a loadout for it, track your journal, or plan the party."
        }
        link={{ href: "/guides", label: "All guides" }}
        cards={[
          {
            href: "/builds/activities",
            emblem: "strip-builds",
            title: "Builds by activity",
            line: "Loadouts players run for each kind of content.",
            scene: "build",
          },
          journal
            ? {
                href: "/guides",
                emblem: "tool-craft",
                title: "Every guide",
                line: "Progression, gathering, PvE, trading and crafting.",
                scene: "economy",
              }
            : {
                href: "/guides/albion-journal-guide",
                emblem: "tool-planner",
                title: "Journal tracker",
                line: "Every journal objective in one list, ticked off as you go.",
                scene: "city",
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

function Contents({ toc }: { toc: { id: string; title: string }[] }) {
  return (
    <nav className={styles.contents} aria-label="Guide contents">
      {toc.map((item, i) => (
        <a href={`#${item.id}`} key={i}>
          {item.title}
        </a>
      ))}
    </nav>
  );
}
