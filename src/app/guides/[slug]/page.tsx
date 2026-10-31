import { AdSlot } from "@/components/ad-slot";
import Link from "@/components/build-region-link";
import { notFound } from "next/navigation";
import { findLibraryGuide, libraryJournal, libraryFishing } from "@/lib/grind-library";
import { FishingCalculator } from "@/components/fishing-calculator";
import { JournalChecklist } from "@/components/journal-checklist";
import { GuideArticleContent } from "@/components/guide-article-content";
import { guideArtwork } from "@/components/grind-guide-directory";
import { GuideReadingTools } from "@/components/guide-reading-tools";
import { ItemIcon } from "@/components/item-icon";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { readingMinutes } from "@/components/guide-cover-card";
import { ArrowLeft } from "lucide-react";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const guide = await findLibraryGuide((await params).slug);
  return { title: guide?.title || "Guide not found", description: guide?.summary };
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const guide = await findLibraryGuide((await params).slug);
  if (!guide) notFound();
  if (guide.slug === "albion-journal-guide")
    return (
      <div className="journal-guide-page support-guide-article">
        <WorkspaceHeading
          glyph="reference"
          scene="guides"
          cover={guide.cover?.src}
          titleId="guide-title"
          title={guide.title}
          description="Pick an objective for your next run. Keep track as you explore."
        >
          <Link className="pill-link is-small masthead-back" href="/guides">
            All guides <ArrowLeft size={14} />
          </Link>
        </WorkspaceHeading>
        <details className="journal-source-details">
          <summary>About your journal progress</summary>
          <p>
            By {guide.author} · Progress is entered manually for this browser and region.
            Game-account progress and current-patch completeness are not inferred.
          </p>
        </details>
        <JournalChecklist entries={await libraryJournal()} />
      </div>
    );
  return (
    <div className="grind-guide-article support-guide-article">
      <WorkspaceHeading
        scene="guides"
        cover={guide.cover?.src}
        titleId="guide-title"
        emblem={<ItemIcon id={guideArtwork[guide.slug] || "T4_BAG"} size={56} />}
        title={guide.title}
        description={`${guide.category} · By ${guide.author} · ${guide.updatedAt ? `Updated ${guide.updatedAt}` : "Original date unavailable"} · ${readingMinutes(guide.content)} min read`}
      >
        <Link className="pill-link is-small masthead-back" href="/guides">
          All guides <ArrowLeft size={14} />
        </Link>
      </WorkspaceHeading>
      <GuideReadingTools />
      <details className="guide-mobile-toc">
        <summary>In this guide</summary>
        <nav aria-label="Guide contents">
          {guide.toc.map((item, i) => (
            <a href={`#${item.id}`} key={i}>
              {item.title}
            </a>
          ))}
        </nav>
      </details>
      <div className="guide-reading-layout">
        <aside className="raised guide-reading-nav">
          <h2>In this guide</h2>
          <nav aria-label="Guide contents">
            {guide.toc.map((item, i) => (
              <a href={`#${item.id}`} key={i}>
                {item.title}
              </a>
            ))}
          </nav>
          <div>
            <p>Make it your next run.</p>
            <Link className="text-link" href="/builds/library">
              Find a loadout →
            </Link>
            <Link className="text-link" href="/tools">
              Open your tools →
            </Link>
          </div>
        </aside>
        <div className="guide-reading-body">
          <div className="raised library-provenance">
            Game balance changes. Check current requirements, yields and costs in game.
            {guide.slug === "fishing-leveling-guide" &&
              " The rebuilt fame calculator is below the article."}
          </div>
          <article className="guide-prose">
            <GuideArticleContent nodes={guide.content} />
          </article>
          {guide.slug === "fishing-leveling-guide" && (
            <FishingCalculator fish={await libraryFishing()} initialMode="leveling" compact />
          )}
          <footer>
            <Link href="/guides" className="text-link">
              Back to the field guide →
            </Link>
          </footer>
          <AdSlot placement="article" />
        </div>
      </div>
    </div>
  );
}
