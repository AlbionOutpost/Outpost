import type { ReactNode } from "react";
import { CalendarDays, ChevronRight, UserRound } from "lucide-react";
import Link from "./build-region-link";
import { ItemIcon } from "./item-icon";
export function BuildDetailHeader({
  title,
  description,
  author,
  authorHref,
  activity,
  tags = [],
  updatedAt,
  revision,
  visibility,
  itemId,
  actions,
}: {
  title: string;
  description?: string;
  author: string;
  authorHref?: string;
  activity: string;
  tags?: string[];
  updatedAt?: string;
  revision?: number;
  visibility?: string;
  itemId?: string;
  actions?: ReactNode;
}) {
  return (
    <section className="detail-hero" id="build-overview">
      <div className="detail-breadcrumb">
        <Link href="/builds/library">Builds</Link>
        <ChevronRight size={13} />
        <span>{title}</span>
      </div>
      <div className="detail-hero-content">
        <div className="detail-hero-copy">
          <div className="detail-hero-tags">
            <span className="detail-activity-badge">{activity}</span>
            {tags.slice(0, 6).map((tag, i) => (
              <span key={`${tag}-${i}`} title={`Author tag: ${tag}`}>
                {tag}
              </span>
            ))}
            {visibility && <span>{visibility.toLowerCase()}</span>}
          </div>
          <div className="detail-title-row">
            {itemId && <ItemIcon id={itemId} size={56} />}
            <h1 className="page-title display-title">{title}</h1>
          </div>
          {description && <p className="detail-hero-description">{description}</p>}
          <div className="detail-author-line">
            <UserRound size={15} />
            <span>By {authorHref ? <Link href={authorHref}>{author}</Link> : author}</span>
            {updatedAt && (
              <span>
                <CalendarDays size={13} />
                <time dateTime={updatedAt}>{updatedAt.slice(0, 10)}</time>
              </span>
            )}
            {revision !== undefined && <span>Revision {revision}</span>}
          </div>
        </div>
        <div className="detail-header-actions">{actions}</div>
      </div>
    </section>
  );
}
export { BuildDetailNavigation } from "./build-detail-navigation";
