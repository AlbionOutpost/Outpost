import Link from "@/components/link";
import { notFound } from "next/navigation";
import { findLibraryGuide, libraryJournal, libraryFishing } from "@/lib/grind-library";
import { FishingCalculator } from "@/components/fishing-calculator";
import { JournalChecklist } from "@/components/journal-checklist";
import { GuideArticleContent } from "@/components/guide-article-content";
import { guideArtwork } from "@/components/grind-guide-directory";
import { ItemIcon } from "@/components/item-icon";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const guide = await findLibraryGuide((await params).slug);
  return { title: guide?.title || "Guide not found", description: guide?.summary };
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const guide = await findLibraryGuide((await params).slug);
  if (!guide) notFound();
  if (guide.slug === "albion-journal-guide")
    return (
      <div className="journal-guide-page">
        <Link href="/guides" className="library-back-link">
          ← All guides
        </Link>
        <h1 className="page-title display-title">{guide.title}</h1>
        <p className="intro">Pick an objective for your next run. Keep track as you explore.</p>
        <details className="journal-source-details">
          <summary>Historical journal · about the source & saved progress</summary>
          <p>
            By {guide.author} · Objectives recovered from the 27 October 2026 archive. Progress is
            entered manually for this browser and region. Game-account progress and current-patch
            completeness are not inferred.
          </p>
        </details>
        <JournalChecklist entries={await libraryJournal()} />
      </div>
    );
  return (
    <div className="grind-guide-article">
      <Link href="/guides" className="library-back-link">
        ← All guides
      </Link>
      <header className="guide-reading-header">
        <div>
          <h1 className="page-title display-title">{guide.title}</h1>
          <p>
            {guide.category} · By {guide.author} ·{" "}
            {guide.updatedAt ? `Updated ${guide.updatedAt}` : "Original date unavailable"}
          </p>
        </div>
        <ItemIcon id={guideArtwork[guide.slug] || "T4_BAG"} size={112} />
      </header>
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
        <aside className="guide-reading-nav">
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
          <div className="library-provenance">
            Restored article · archive captured 27 October 2026. Historical game facts and
            recommendations await current-patch review.
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
            <Link className="text-link" href={`https://albiononlinegrind.com/guides/${guide.slug}`}>
              Original article ↗
            </Link>
            <Link href="/guides" className="text-link">
              Back to the field guide →
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
