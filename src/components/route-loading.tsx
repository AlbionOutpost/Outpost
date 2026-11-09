import styles from "./route-loading.module.css";

/**
 * Any route but the landing while it streams: an empty masthead in the real one's place, then
 * three quiet wells. Each top-level route folder's loading.tsx re-exports it. The landing has no
 * loading boundary, so its hero arrives with the first paint instead of replacing a skeleton
 * (React reveals a streamed boundary at least 300 ms after the first paint).
 */
export default function RouteLoading() {
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
