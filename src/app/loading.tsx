import styles from "./loading.module.css";

/** Any route while it streams: an empty masthead in the real one's place, then three quiet wells. */
export default function Loading() {
  return (
    <div role="status" className={styles.loading}>
      <div className="workspace-identity" data-scene="page" aria-hidden="true">
        <div className="workspace-identity-copy">
          <div className="workspace-identity-head">
            <span className={`workspace-emblem ${styles.emblem}`} />
            <div className={styles.copy}>
              <span className={styles.title} />
              <span className={styles.line} />
            </div>
          </div>
        </div>
      </div>
      <div className={styles.grid} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={styles.block} />
        ))}
      </div>
      <span className="sr-only">Loading page…</span>
    </div>
  );
}
