import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "@/components/build-region-link";
import { activityBackgrounds } from "@/lib/activity-backgrounds";
import activityOutlines from "@/lib/activity-outlines.json";
import { ItemIcon } from "@/components/item-icon";
import styles from "./activity-artwork-card.module.css";

/** The artwork is 800px wide; `scripts/activity-image-variants.mjs` writes the narrower files. */
const srcSet = (src: string) =>
  `${[400, 600].map((w) => `${src.replace(/\.webp$/, `-${w}w.webp`)} ${w}w`).join(", ")}, ${src} 800w`;
/** A full card's width on the library's activities page. */
const librarySizes =
  "(max-width: 599px) 100vw, (max-width: 899px) 50vw, (max-width: 1199px) 33vw, 380px";

/** The sharp scene and its three blur layers share one candidate: one download per card. */
function Art({ src, sizes, scene }: { src: string; sizes: string; scene?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static artwork with its own srcset
    <img
      className={scene ? styles.scene : undefined}
      data-activity-scene={scene ? "true" : undefined}
      src={src}
      srcSet={srcSet(src)}
      sizes={sizes}
      alt=""
      loading="lazy"
      decoding="async"
    />
  );
}

export function ActivityArtworkCard({
  category,
  name,
  builds,
  compact = false,
  weapons = [],
  sizes = librarySizes,
}: {
  category: string;
  name: string;
  builds: number;
  compact?: boolean;
  weapons?: { itemId: string; name: string }[];
  /** The card's rendered width in its grid, so each screen loads the width it draws. */
  sizes?: string;
}) {
  const art = activityBackgrounds.find((a) => a.id === category);
  return (
    <article
      className={`activity-artwork-card ${styles.card} ${compact ? styles.compact : ""}`}
      data-activity={category}
    >
      <Link
        className={`activity-artwork-link ${styles.main}`}
        href={`/builds/library?category=${encodeURIComponent(category)}`}
        prefetch={false}
        style={
          art
            ? ({
                "--activity-outline": activityOutlines[art.id],
              } as CSSProperties)
            : undefined
        }
      >
        {art && <Art src={art.src} sizes={sizes} scene />}
        <span className={styles.blur} aria-hidden="true">
          {[0, 1, 2].map((layer) => (
            <span key={layer}>{art && <Art src={art.src} sizes={sizes} />}</span>
          ))}
        </span>
        <span className={styles.border} aria-hidden="true" />
        <div className={styles.caption}>
          <div>
            {weapons.length > 0 && (
              <span
                className={styles.weapons}
                role="group"
                aria-label="Weapons from top category builds"
              >
                {weapons.slice(0, 3).map((weapon) => (
                  <span
                    key={weapon.itemId}
                    data-activity-weapon={weapon.itemId}
                    role="img"
                    aria-label={weapon.name}
                    title={weapon.name}
                  >
                    <ItemIcon id={weapon.itemId} size={56} />
                  </span>
                ))}
              </span>
            )}
            <h3>{name}</h3>
            <small>
              {builds
                ? `${builds.toLocaleString("en-US")} ${builds === 1 ? "build" : "builds"}`
                : "No builds listed yet"}
            </small>
          </div>
          <ArrowUpRight size={21} aria-hidden="true" />
        </div>
      </Link>
    </article>
  );
}
